from __future__ import annotations

from typing import Any


def _by_cusip(quarter: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        holding["cusip"]: holding
        for holding in quarter.get("holdings", [])
        if holding.get("cusip")
    }


def _percent_change(current: int, previous: int) -> float | None:
    if previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 4)


def _trend_for_cusip(cusip: str, quarters: list[dict[str, Any]]) -> tuple[str | None, int, int]:
    newest_first = [_by_cusip(quarter).get(cusip) for quarter in quarters]
    quarters_held = sum(1 for holding in newest_first if holding)
    consecutive_held = 0
    for holding in newest_first:
        if not holding:
            break
        consecutive_held += 1

    current = newest_first[0] if newest_first else None
    previous = newest_first[1] if len(newest_first) > 1 else None
    older = [holding for holding in newest_first[2:] if holding]

    if current and not previous and older:
        trend = "Re-entered"
    elif current and not previous:
        trend = "New"
    elif not current and previous:
        trend = "Exited"
    elif current and previous:
        recent = [holding for holding in newest_first[:4] if holding]
        share_deltas = [
            recent[index]["shares"] - recent[index + 1]["shares"]
            for index in range(len(recent) - 1)
        ]
        if share_deltas and all(delta > 0 for delta in share_deltas):
            trend = "Accumulating"
        elif share_deltas and all(delta < 0 for delta in share_deltas):
            trend = "Trimming"
        else:
            trend = "Stable"
    else:
        trend = None

    return trend, quarters_held, consecutive_held


def enrich_quarters_with_trends(quarters: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cusips = {
        holding["cusip"]
        for quarter in quarters
        for holding in quarter.get("holdings", [])
        if holding.get("cusip")
    }
    trend_by_cusip = {
        cusip: _trend_for_cusip(cusip, quarters)
        for cusip in cusips
    }

    for quarter in quarters:
        for holding in quarter.get("holdings", []):
            trend, quarters_held, consecutive_held = trend_by_cusip.get(holding.get("cusip"), (None, 0, 0))
            holding["trend"] = trend
            holding["quartersHeld"] = quarters_held
            holding["consecutiveQuartersHeld"] = consecutive_held
    return quarters


def compare_quarters(current: dict[str, Any], previous: dict[str, Any]) -> list[dict[str, Any]]:
    current_by_cusip = _by_cusip(current)
    previous_by_cusip = _by_cusip(previous)
    changes: list[dict[str, Any]] = []

    for cusip, current_holding in current_by_cusip.items():
        prior_holding = previous_by_cusip.get(cusip)
        if prior_holding is None:
            action = "New Position"
            share_change = current_holding["shares"]
            value_change = current_holding["value"]
            previous_value = 0
            previous_weight = 0
        else:
            share_change = current_holding["shares"] - prior_holding["shares"]
            value_change = current_holding["value"] - prior_holding["value"]
            previous_value = prior_holding["value"]
            previous_weight = prior_holding["portfolioWeight"]
            if share_change > 0:
                action = "Added"
            elif share_change < 0:
                action = "Reduced"
            else:
                action = "Unchanged"

        changes.append(
            {
                **current_holding,
                "action": action,
                "previousShares": prior_holding["shares"] if prior_holding else 0,
                "previousValue": previous_value,
                "previousWeight": previous_weight,
                "shareChange": share_change,
                "shareChangePercent": _percent_change(current_holding["shares"], prior_holding["shares"] if prior_holding else 0),
                "valueChange": value_change,
                "weightChange": round(current_holding["portfolioWeight"] - previous_weight, 4),
            }
        )

    for cusip, prior_holding in previous_by_cusip.items():
        if cusip in current_by_cusip:
            continue
        changes.append(
            {
                **prior_holding,
                "value": 0,
                "shares": 0,
                "portfolioWeight": 0,
                "action": "Sold Out",
                "filingDate": current.get("filingDate"),
                "reportDate": current.get("reportDate"),
                "secUrl": current.get("secUrl"),
                "previousShares": prior_holding["shares"],
                "previousValue": prior_holding["value"],
                "previousWeight": prior_holding["portfolioWeight"],
                "shareChange": -prior_holding["shares"],
                "shareChangePercent": -100,
                "valueChange": -prior_holding["value"],
                "weightChange": round(-prior_holding["portfolioWeight"], 4),
            }
        )

    action_order = {
        "New Position": 0,
        "Added": 1,
        "Reduced": 2,
        "Sold Out": 3,
        "Unchanged": 4,
    }
    changes.sort(key=lambda item: (action_order.get(item["action"], 9), -abs(item.get("valueChange", 0))))
    return changes


def build_history(quarters: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "filingDate": quarter.get("filingDate"),
            "reportDate": quarter.get("reportDate"),
            "secUrl": quarter.get("secUrl"),
            "totalValue": quarter.get("totalValue", 0),
            "holdingsCount": quarter.get("holdingsCount", 0),
        }
        for quarter in quarters
    ]
