from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[1] / "public" / "data"
REQUIRED_FILES = ("latest", "history", "changes", "quarters", "performance")
HOLDING_FIELDS = (
    "issuerName",
    "cusip",
    "value",
    "shares",
    "portfolioWeight",
    "filingDate",
    "reportDate",
    "secUrl",
)


def load_json(name: str, errors: list[str]) -> Any:
    path = DATA_DIR / f"{name}.json"
    if not path.exists():
        errors.append(f"{name}.json: file is missing")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{name}.json: invalid JSON at line {exc.lineno}, column {exc.colno}")
        return None


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_holding(holding: Any, label: str, errors: list[str]) -> None:
    if not isinstance(holding, dict):
        errors.append(f"{label}: holding must be an object")
        return

    for field in HOLDING_FIELDS:
        if field not in holding:
            errors.append(f"{label}: missing {field}")

    if not holding.get("issuerName"):
        errors.append(f"{label}: issuerName is required")
    if not holding.get("cusip"):
        errors.append(f"{label}: cusip is required")

    for field in ("value", "shares", "portfolioWeight"):
        if field in holding and not is_number(holding[field]):
            errors.append(f"{label}: {field} must be numeric")

    if is_number(holding.get("value")) and holding["value"] < 0:
        errors.append(f"{label}: value must be >= 0")
    if is_number(holding.get("shares")) and holding["shares"] < 0:
        errors.append(f"{label}: shares must be >= 0")
    if is_number(holding.get("portfolioWeight")) and not 0 <= holding["portfolioWeight"] <= 100:
        errors.append(f"{label}: portfolioWeight must be between 0 and 100")


def validate_latest(latest: Any, errors: list[str]) -> None:
    if not isinstance(latest, dict):
        errors.append("latest.json: root must be an object")
        return

    holdings = latest.get("holdings")
    if not isinstance(holdings, list) or not holdings:
        errors.append("latest.json: holdings must be a non-empty array")
        return

    if latest.get("holdingsCount") != len(holdings):
        errors.append("latest.json: holdingsCount does not match holdings length")

    for index, holding in enumerate(holdings):
        validate_holding(holding, f"latest.json.holdings[{index}]", errors)


def validate_history(history: Any, latest: Any, errors: list[str]) -> None:
    if not isinstance(history, list):
        errors.append("history.json: root must be an array")
        return
    if len(history) < 2:
        errors.append("history.json: must contain at least 2 quarters")
        return
    if isinstance(latest, dict) and history[0].get("reportDate") != latest.get("reportDate"):
        errors.append("history.json[0]: reportDate does not match latest.json")


def validate_changes(changes: Any, errors: list[str]) -> None:
    if not isinstance(changes, list):
        errors.append("changes.json: root must be an array")


def validate_quarters(quarters: Any, latest: Any, errors: list[str]) -> None:
    if not isinstance(quarters, list):
        errors.append("quarters.json: root must be an array")
        return
    if len(quarters) < 2:
        errors.append("quarters.json: must contain at least 2 quarters")
        return
    if not isinstance(quarters[0], dict):
        errors.append("quarters.json[0]: quarter must be an object")
        return

    first = quarters[0]
    if isinstance(latest, dict):
        if first.get("reportDate") != latest.get("reportDate"):
            errors.append("quarters.json[0]: reportDate does not match latest.json")
        if first.get("totalValue") != latest.get("totalValue"):
            errors.append("quarters.json[0]: totalValue does not match latest.json")
        if first.get("holdingsCount") != latest.get("holdingsCount"):
            errors.append("quarters.json[0]: holdingsCount does not match latest.json")

    for quarter_index, quarter in enumerate(quarters):
        holdings = quarter.get("holdings") if isinstance(quarter, dict) else None
        if not isinstance(holdings, list) or not holdings:
            errors.append(f"quarters.json[{quarter_index}]: holdings must be a non-empty array")
            continue
        if quarter.get("holdingsCount") != len(holdings):
            errors.append(f"quarters.json[{quarter_index}]: holdingsCount does not match holdings length")
        for holding_index, holding in enumerate(holdings):
            validate_holding(holding, f"quarters.json[{quarter_index}].holdings[{holding_index}]", errors)


def validate_performance(performance: Any, errors: list[str]) -> None:
    if not isinstance(performance, dict):
        errors.append("performance.json: root must be an object")
        return

    points = performance.get("points")
    if not isinstance(points, list):
        errors.append("performance.json: points must be an array")
        return
    if not points:
        return
    if len(points) < 2:
        errors.append("performance.json: non-empty points must contain at least 2 entries")

    for index, point in enumerate(points):
        if not isinstance(point, dict):
            errors.append(f"performance.json.points[{index}]: point must be an object")
            continue
        for field in ("portfolioValue", "benchmarkValue", "portfolioReturn", "benchmarkReturn"):
            if field not in point:
                errors.append(f"performance.json.points[{index}]: missing {field}")
            elif not is_number(point[field]):
                errors.append(f"performance.json.points[{index}]: {field} must be numeric")

    quarterly_returns = performance.get("quarterlyReturns")
    if not isinstance(quarterly_returns, list):
        errors.append("performance.json: quarterlyReturns must be an array")
        return

    all_zero_returns = bool(quarterly_returns) and all(
        isinstance(item, dict)
        and item.get("portfolioReturn") == 0
        and item.get("benchmarkReturn") == 0
        for item in quarterly_returns
    )
    missing_symbols = performance.get("missingSymbols")
    if all_zero_returns and isinstance(missing_symbols, list) and "SPY" in missing_symbols:
        errors.append("performance.json: benchmark data missing; refusing all-zero performance output")


def main() -> int:
    errors: list[str] = []
    data = {name: load_json(name, errors) for name in REQUIRED_FILES}

    validate_latest(data["latest"], errors)
    validate_history(data["history"], data["latest"], errors)
    validate_changes(data["changes"], errors)
    validate_quarters(data["quarters"], data["latest"], errors)
    validate_performance(data["performance"], errors)

    if errors:
        print("Data validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Data validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
