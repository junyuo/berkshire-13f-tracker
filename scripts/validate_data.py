from __future__ import annotations

import json
import math
import sys
import argparse
from datetime import datetime
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[1] / "public" / "data"
REQUIRED_FILES = ("latest", "history", "changes", "quarters", "performance", "official_cost_basis")
HOLDING_FIELDS = (
    "issuerName",
    "cusip",
    "value",
    "shares",
    "portfolioWeight",
    "filingDate",
    "reportDate",
    "secUrl",
    "cost",
)

COST_STATUSES = ("official", "hybrid", "estimated", "unavailable")
COST_METHODS = ("reported", "reported-carried", "reported-plus-estimates", "observed-period-estimate")
COST_REASONS = ("insufficient-history", "missing-price", "corporate-action", "unsupported-security", "sold-out")


def load_json(name: str, errors: list[str], data_dir: Path) -> Any:
    path = data_dir / f"{name}.json"
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


def is_iso_date(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


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

    cost = holding.get("cost")
    if not isinstance(cost, dict):
        errors.append(f"{label}.cost: must be an object")
        return
    required_cost_fields = (
        "status",
        "basis",
        "basisLow",
        "basisHigh",
        "averagePrice",
        "method",
        "sourceAsOf",
        "sourceUrl",
        "reason",
    )
    for field in required_cost_fields:
        if field not in cost:
            errors.append(f"{label}.cost: missing {field}")

    status = cost.get("status")
    if status not in COST_STATUSES:
        errors.append(f"{label}.cost: invalid status")
        return
    if status == "unavailable":
        if any(cost.get(field) is not None for field in ("basis", "basisLow", "basisHigh", "averagePrice", "method")):
            errors.append(f"{label}.cost: unavailable cost must not contain numeric values or a method")
        if cost.get("reason") not in COST_REASONS:
            errors.append(f"{label}.cost: unavailable cost must contain a valid reason")
        return

    values = [cost.get(field) for field in ("basis", "basisLow", "basisHigh", "averagePrice")]
    if not all(is_number(value) and value >= 0 for value in values):
        errors.append(f"{label}.cost: available cost values must be non-negative numbers")
        return
    if not cost["basisLow"] <= cost["basis"] <= cost["basisHigh"]:
        errors.append(f"{label}.cost: basis must fall within its range")
    if holding.get("shares", 0) <= 0:
        errors.append(f"{label}.cost: available cost requires positive shares")
    elif not math.isclose(cost["averagePrice"], cost["basis"] / holding["shares"], rel_tol=1e-6, abs_tol=1e-5):
        errors.append(f"{label}.cost: averagePrice must equal basis divided by shares")
    if cost.get("method") not in COST_METHODS:
        errors.append(f"{label}.cost: available cost must contain a valid method")
    if cost.get("reason") is not None:
        errors.append(f"{label}.cost: available cost must not contain a reason")
    if status in ("official", "hybrid") and (not is_iso_date(cost.get("sourceAsOf")) or not cost.get("sourceUrl")):
        errors.append(f"{label}.cost: official and hybrid costs require source metadata")


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
    if not latest.get("accessionNumber"):
        errors.append("latest.json: accessionNumber is required")
    if not is_iso_date(latest.get("generatedAt")):
        errors.append("latest.json: generatedAt must be an ISO date")

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
        return
    for index, holding in enumerate(changes):
        validate_holding(holding, f"changes.json[{index}]", errors)


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
        if first.get("accessionNumber") != latest.get("accessionNumber"):
            errors.append("quarters.json[0]: accessionNumber does not match latest.json")
        if first.get("reportDate") != latest.get("reportDate"):
            errors.append("quarters.json[0]: reportDate does not match latest.json")
        if first.get("totalValue") != latest.get("totalValue"):
            errors.append("quarters.json[0]: totalValue does not match latest.json")
        if first.get("holdingsCount") != latest.get("holdingsCount"):
            errors.append("quarters.json[0]: holdingsCount does not match latest.json")

    for quarter_index, quarter in enumerate(quarters):
        if isinstance(quarter, dict) and not quarter.get("accessionNumber"):
            errors.append(f"quarters.json[{quarter_index}]: accessionNumber is required")
        holdings = quarter.get("holdings") if isinstance(quarter, dict) else None
        if not isinstance(holdings, list) or not holdings:
            errors.append(f"quarters.json[{quarter_index}]: holdings must be a non-empty array")
            continue
        if quarter.get("holdingsCount") != len(holdings):
            errors.append(f"quarters.json[{quarter_index}]: holdingsCount does not match holdings length")
        for holding_index, holding in enumerate(holdings):
            validate_holding(holding, f"quarters.json[{quarter_index}].holdings[{holding_index}]", errors)

    report_dates = [quarter.get("reportDate") for quarter in quarters if isinstance(quarter, dict)]
    if report_dates != sorted(report_dates, reverse=True):
        errors.append("quarters.json: reportDate values must be sorted from newest to oldest")


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
    if len(quarterly_returns) != len(points) - 1:
        errors.append("performance.json: quarterlyReturns length must equal points length minus 1")
    if performance.get("endDate") != points[-1].get("date"):
        errors.append("performance.json: last point date must match endDate")
    if not is_iso_date(performance.get("generatedAt")):
        errors.append("performance.json: generatedAt must be an ISO date when points are present")

    all_zero_returns = bool(quarterly_returns) and all(
        isinstance(item, dict)
        and item.get("portfolioReturn") == 0
        and item.get("benchmarkReturn") == 0
        for item in quarterly_returns
    )
    missing_symbols = performance.get("missingSymbols")
    if all_zero_returns and isinstance(missing_symbols, list) and "SPY" in missing_symbols:
        errors.append("performance.json: benchmark data missing; refusing all-zero performance output")


def validate_official_cost_basis(data: Any, errors: list[str]) -> None:
    if not isinstance(data, dict):
        errors.append("official_cost_basis.json: root must be an object")
        return
    for field in ("sourceLabel", "sourceUrl", "sourceAsOf", "amountPrecision", "holdings"):
        if field not in data:
            errors.append(f"official_cost_basis.json: missing {field}")
    if not is_iso_date(data.get("sourceAsOf")):
        errors.append("official_cost_basis.json: sourceAsOf must be an ISO date")
    if not is_number(data.get("amountPrecision")) or data.get("amountPrecision", 0) <= 0:
        errors.append("official_cost_basis.json: amountPrecision must be positive")
    holdings = data.get("holdings")
    if not isinstance(holdings, list) or not holdings:
        errors.append("official_cost_basis.json: holdings must be a non-empty array")
        return
    seen: set[str] = set()
    for index, holding in enumerate(holdings):
        label = f"official_cost_basis.json.holdings[{index}]"
        if not isinstance(holding, dict):
            errors.append(f"{label}: must be an object")
            continue
        for field in ("ticker", "cusip"):
            if not holding.get(field):
                errors.append(f"{label}: {field} is required")
        for field in ("shares", "basis"):
            if not is_number(holding.get(field)) or holding.get(field, 0) <= 0:
                errors.append(f"{label}: {field} must be positive")
        if holding.get("cusip") in seen:
            errors.append(f"{label}: duplicate CUSIP")
        seen.add(holding.get("cusip"))


def validate_directory(data_dir: Path) -> list[str]:
    errors: list[str] = []
    data = {name: load_json(name, errors, data_dir) for name in REQUIRED_FILES}

    validate_latest(data["latest"], errors)
    validate_history(data["history"], data["latest"], errors)
    validate_changes(data["changes"], errors)
    validate_quarters(data["quarters"], data["latest"], errors)
    validate_performance(data["performance"], errors)
    validate_official_cost_basis(data["official_cost_basis"], errors)
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate generated Berkshire 13F data.")
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR)
    args = parser.parse_args()
    errors = validate_directory(args.data_dir)

    if errors:
        print("Data validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Data validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
