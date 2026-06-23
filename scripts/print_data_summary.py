from __future__ import annotations

import json
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parents[1] / "public" / "data"


def load_json(name: str):
    return json.loads((DATA_DIR / f"{name}.json").read_text(encoding="utf-8"))


def main() -> int:
    latest = load_json("latest")
    changes = load_json("changes")
    performance = load_json("performance")

    print("Data update summary")
    print(f"- accession number: {latest.get('accessionNumber')}")
    print(f"- latest report date: {latest.get('reportDate')}")
    print(f"- filing date: {latest.get('filingDate')}")
    print(f"- holdings count: {latest.get('holdingsCount')}")
    print(f"- changes count: {len(changes) if isinstance(changes, list) else 'invalid'}")
    print(f"- performance points: {len(performance.get('points', [])) if isinstance(performance, dict) else 'invalid'}")
    print(f"- missing symbols: {len(performance.get('missingSymbols', [])) if isinstance(performance, dict) else 'invalid'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
