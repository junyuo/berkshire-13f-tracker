from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from compare_quarters import build_history, compare_quarters, enrich_quarters_with_trends
from performance import build_performance
from parse_13f import FilingMeta, parse_information_table


CIK = "0001067983"
SEC_BASE = "https://www.sec.gov"
SEC_DATA_BASE = "https://data.sec.gov"
DATA_DIR = Path(__file__).resolve().parents[1] / "public" / "data"
HEADERS = {
    "User-Agent": "berkshire-13f-tracker/0.1 contact@example.com",
    "Accept-Encoding": "gzip, deflate",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)
SESSION.mount(
    "https://",
    HTTPAdapter(
        max_retries=Retry(
            total=5,
            backoff_factor=0.8,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=("GET",),
        )
    ),
)


@dataclass(frozen=True)
class FilingCandidate:
    accession_number: str
    filing_date: str
    report_date: str
    primary_document: str

    @property
    def accession_no_dashes(self) -> str:
        return self.accession_number.replace("-", "")

    @property
    def filing_dir_url(self) -> str:
        return f"{SEC_BASE}/Archives/edgar/data/{int(CIK)}/{self.accession_no_dashes}"

    @property
    def sec_url(self) -> str:
        return f"{self.filing_dir_url}/{self.primary_document}"


def _get_json(url: str) -> dict[str, Any]:
    response = SESSION.get(url, timeout=30)
    response.raise_for_status()
    time.sleep(0.12)
    return response.json()


def _get_text(url: str) -> str:
    response = SESSION.get(url, timeout=30)
    response.raise_for_status()
    time.sleep(0.12)
    return response.text


def get_recent_13f_filings(limit: int = 2) -> list[FilingCandidate]:
    submissions = _get_json(f"{SEC_DATA_BASE}/submissions/CIK{CIK}.json")
    recent = submissions["filings"]["recent"]
    filings: list[FilingCandidate] = []

    for index, form in enumerate(recent["form"]):
        if form != "13F-HR":
            continue
        filings.append(
            FilingCandidate(
                accession_number=recent["accessionNumber"][index],
                filing_date=recent["filingDate"][index],
                report_date=recent["reportDate"][index],
                primary_document=recent["primaryDocument"][index],
            )
        )
        if len(filings) == limit:
            return filings

    return filings


def _find_information_table_url(filing: FilingCandidate) -> str:
    index_json = _get_json(f"{filing.filing_dir_url}/index.json")
    items = index_json["directory"]["item"]
    xml_items = [
        item["name"]
        for item in items
        if item["name"].lower().endswith(".xml")
    ]

    preferred = [
        name
        for name in xml_items
        if "infotable" in name.lower() or "form13f" in name.lower()
    ]

    for name in preferred + xml_items:
        url = f"{filing.filing_dir_url}/{name}"
        text = _get_text(url)
        if "infoTable" in text or "infotable" in text.lower():
            return url

    raise RuntimeError(f"No 13F information table XML found for {filing.accession_number}")


def fetch_quarter(filing: FilingCandidate) -> dict[str, Any]:
    table_url = _find_information_table_url(filing)
    xml_text = _get_text(table_url)
    return parse_information_table(
        xml_text,
        FilingMeta(
            accession_number=filing.accession_number,
            filing_date=filing.filing_date,
            report_date=filing.report_date,
            sec_url=filing.sec_url,
        ),
    )


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    filings = get_recent_13f_filings(limit=8)
    if len(filings) < 2:
        raise RuntimeError("SEC submissions feed returned fewer than two 13F-HR filings.")

    quarters = enrich_quarters_with_trends([fetch_quarter(filing) for filing in filings])
    latest, previous = quarters[0], quarters[1]
    latest["generatedAt"] = datetime.now(UTC).isoformat()

    write_json(DATA_DIR / "latest.json", latest)
    write_json(DATA_DIR / "history.json", build_history(quarters))
    write_json(DATA_DIR / "changes.json", compare_quarters(latest, previous))
    write_json(DATA_DIR / "quarters.json", quarters)
    write_json(DATA_DIR / "performance.json", build_performance(quarters, SESSION))

    print(
        f"Wrote {latest['holdingsCount']} latest holdings for report date "
        f"{latest['reportDate']} and {len(compare_quarters(latest, previous))} changes."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
