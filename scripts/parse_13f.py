from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from xml.etree import ElementTree as ET

from ticker_map import TICKER_BY_CUSIP


@dataclass(frozen=True)
class FilingMeta:
    accession_number: str
    filing_date: str
    report_date: str
    sec_url: str


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _child_text(node: ET.Element, name: str) -> str | None:
    expected = name.lower()
    for child in list(node):
        if _local_name(child.tag) == expected:
            text = "".join(child.itertext()).strip()
            return text or None
    return None


def _descendant_text(node: ET.Element, name: str) -> str | None:
    expected = name.lower()
    for child in node.iter():
        if _local_name(child.tag) == expected:
            text = "".join(child.itertext()).strip()
            return text or None
    return None


def _shares_from_info_table(info_table: ET.Element) -> int:
    ssh_prnamt = _descendant_text(info_table, "sshPrnamt")
    if not ssh_prnamt:
        return 0
    return int(float(ssh_prnamt.replace(",", "")))


def _value_from_info_table(info_table: ET.Element) -> int:
    value = _child_text(info_table, "value")
    if not value:
        return 0
    return int(float(value.replace(",", "")))


def parse_information_table(xml_text: str, filing: FilingMeta) -> dict[str, Any]:
    root = ET.fromstring(xml_text)
    by_cusip: dict[str, dict[str, Any]] = {}

    for node in root.iter():
        if _local_name(node.tag) != "infotable":
            continue

        cusip = _child_text(node, "cusip")
        if not cusip:
            continue

        existing = by_cusip.get(cusip)
        if existing:
            existing["value"] += _value_from_info_table(node)
            existing["shares"] += _shares_from_info_table(node)
        else:
            by_cusip[cusip] = {
                "issuerName": _child_text(node, "nameOfIssuer"),
                "ticker": TICKER_BY_CUSIP.get(cusip),
                "cusip": cusip,
                "value": _value_from_info_table(node),
                "shares": _shares_from_info_table(node),
                "portfolioWeight": 0,
                "action": "Unchanged",
                "filingDate": filing.filing_date,
                "reportDate": filing.report_date,
                "secUrl": filing.sec_url,
            }

    rows = list(by_cusip.values())
    total_value = sum(item["value"] for item in rows)
    for item in rows:
        item["portfolioWeight"] = round((item["value"] / total_value) * 100, 4) if total_value else 0

    rows.sort(key=lambda item: item["value"], reverse=True)

    return {
        "filingDate": filing.filing_date,
        "reportDate": filing.report_date,
        "secUrl": filing.sec_url,
        "totalValue": total_value,
        "holdingsCount": len(rows),
        "holdings": rows,
    }
