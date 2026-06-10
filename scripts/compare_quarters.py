from __future__ import annotations

from typing import Any


def _by_cusip(quarter: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        holding["cusip"]: holding
        for holding in quarter.get("holdings", [])
        if holding.get("cusip")
    }


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
        else:
            share_change = current_holding["shares"] - prior_holding["shares"]
            value_change = current_holding["value"] - prior_holding["value"]
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
                "shareChange": share_change,
                "valueChange": value_change,
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
                "shareChange": -prior_holding["shares"],
                "valueChange": -prior_holding["value"],
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
