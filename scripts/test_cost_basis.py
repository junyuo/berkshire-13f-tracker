from __future__ import annotations

import unittest
from datetime import date, timedelta

from cost_basis import OFFICIAL_COST_PATH, PriceHistory, SplitEvent, enrich_quarters_with_costs, load_official_costs


def holding(ticker: str, cusip: str, shares: int, issuer: str | None = None) -> dict:
    return {
        "issuerName": issuer or ticker,
        "ticker": ticker,
        "cusip": cusip,
        "shares": shares,
        "value": shares * 20,
        "portfolioWeight": 10,
    }


def quarter(report_date: str, holdings: list[dict]) -> dict:
    return {"reportDate": report_date, "holdings": holdings}


def daily_prices(start: str, end: str, value: float) -> dict[str, float]:
    current = date.fromisoformat(start) + timedelta(days=1)
    final = date.fromisoformat(end)
    prices = {}
    while current <= final:
        prices[current.isoformat()] = value
        current += timedelta(days=1)
    return prices


def official_data(cusip: str, shares: int, basis: int, source_as_of: str) -> dict:
    return {
        "sourceLabel": "Test annual report",
        "sourceUrl": "https://example.com/report.pdf",
        "sourceAsOf": source_as_of,
        "amountPrecision": 1000000,
        "holdings": [{"ticker": "AAA", "cusip": cusip, "shares": shares, "basis": basis}],
    }


class CostBasisTests(unittest.TestCase):
    def test_official_cost_and_unchanged_carry_forward(self) -> None:
        quarters = [
            quarter("2025-06-30", [holding("AAA", "AAA000001", 100)]),
            quarter("2025-03-31", [holding("AAA", "AAA000001", 100)]),
        ]
        enriched = enrich_quarters_with_costs(quarters, official_data("AAA000001", 100, 1000, "2025-03-31"), {})

        self.assertEqual(enriched[1]["holdings"][0]["cost"]["status"], "official")
        self.assertEqual(enriched[0]["holdings"][0]["cost"]["method"], "reported-carried")
        self.assertEqual(enriched[0]["holdings"][0]["cost"]["averagePrice"], 10)

    def test_new_add_and_reduce_use_observed_period_prices(self) -> None:
        quarters = [
            quarter("2025-09-30", [holding("AAA", "AAA000001", 75)]),
            quarter("2025-06-30", [holding("AAA", "AAA000001", 150)]),
            quarter("2025-03-31", [holding("AAA", "AAA000001", 100)]),
            quarter("2024-12-31", []),
        ]
        prices = {}
        prices.update(daily_prices("2024-12-31", "2025-03-31", 10))
        prices.update(daily_prices("2025-03-31", "2025-06-30", 20))
        prices.update(daily_prices("2025-06-30", "2025-09-30", 30))
        enriched = enrich_quarters_with_costs(
            quarters,
            official_data("OTHER0001", 1, 1, "2025-03-31"),
            {"AAA": PriceHistory(prices)},
        )

        first, added, reduced = enriched[2]["holdings"][0], enriched[1]["holdings"][0], enriched[0]["holdings"][0]
        self.assertEqual(first["cost"]["basis"], 1000)
        self.assertEqual(added["cost"]["basis"], 2000)
        self.assertAlmostEqual(added["cost"]["averagePrice"], 13.333333)
        self.assertEqual(reduced["cost"]["basis"], 1000)

    def test_oldest_holding_and_missing_price_fail_closed(self) -> None:
        oldest = quarter("2025-03-31", [holding("OLD", "OLD000001", 100)])
        new = quarter("2025-06-30", [holding("NEW", "NEW000001", 100), holding("OLD", "OLD000001", 100)])
        enriched = enrich_quarters_with_costs(
            [new, oldest],
            official_data("OTHER0001", 1, 1, "2025-03-31"),
            {},
        )

        by_ticker = {item["ticker"]: item["cost"] for item in enriched[0]["holdings"]}
        self.assertEqual(by_ticker["OLD"]["reason"], "insufficient-history")
        self.assertEqual(by_ticker["NEW"]["reason"], "missing-price")

    def test_split_normalizes_shares_without_creating_a_purchase(self) -> None:
        prices = daily_prices("2025-03-31", "2025-06-30", 10)
        history = PriceHistory(prices, (SplitEvent("2025-05-15", 2),))
        quarters = [
            quarter("2025-06-30", [holding("AAA", "AAA000001", 200)]),
            quarter("2025-03-31", [holding("AAA", "AAA000001", 100)]),
        ]
        enriched = enrich_quarters_with_costs(
            quarters,
            official_data("AAA000001", 100, 1000, "2025-03-31"),
            {"AAA": history},
        )

        cost = enriched[0]["holdings"][0]["cost"]
        self.assertEqual(cost["status"], "official")
        self.assertEqual(cost["basis"], 1000)
        self.assertEqual(cost["averagePrice"], 5)

    def test_same_issuer_with_new_cusip_is_not_treated_as_a_new_purchase(self) -> None:
        quarters = [
            quarter("2025-06-30", [holding("AAA", "NEW000001", 100, "Same Company")]),
            quarter("2025-03-31", [holding("", "OLD000001", 100, "Same Company")]),
        ]
        prices = PriceHistory(daily_prices("2025-03-31", "2025-06-30", 10))
        enriched = enrich_quarters_with_costs(
            quarters,
            official_data("OTHER0001", 1, 1, "2025-03-31"),
            {"AAA": prices},
        )

        self.assertEqual(enriched[0]["holdings"][0]["cost"]["reason"], "corporate-action")

    def test_split_like_share_jump_without_an_event_fails_closed(self) -> None:
        previous = holding("AAA", "AAA000001", 100)
        previous["value"] = 1000
        current = holding("AAA", "AAA000001", 200)
        current["value"] = 1100
        quarters = [quarter("2025-06-30", [current]), quarter("2025-03-31", [previous])]
        prices = PriceHistory(daily_prices("2025-03-31", "2025-06-30", 5))
        enriched = enrich_quarters_with_costs(
            quarters,
            official_data("AAA000001", 100, 1000, "2025-03-31"),
            {"AAA": prices},
        )

        self.assertEqual(enriched[0]["holdings"][0]["cost"]["reason"], "corporate-action")

    def test_published_official_average_costs(self) -> None:
        data = load_official_costs(OFFICIAL_COST_PATH)
        averages = {item["ticker"]: item["basis"] / item["shares"] for item in data["holdings"]}
        self.assertAlmostEqual(averages["AAPL"], 27.44, places=2)
        self.assertAlmostEqual(averages["AXP"], 8.49, places=2)
        self.assertAlmostEqual(averages["KO"], 3.25, places=2)
        self.assertAlmostEqual(averages["MCO"], 10.05, places=2)


if __name__ == "__main__":
    unittest.main()
