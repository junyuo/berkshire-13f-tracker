from __future__ import annotations

import csv
import io
from datetime import UTC, datetime
from typing import Any

import requests


BENCHMARK_TICKER = "SPY"
PRICE_SOURCE = "stooq"
PRICE_SOURCE_URL = "https://stooq.com/q/d/l/"


def _stooq_symbol(ticker: str) -> str:
    return f"{ticker.lower().replace('.', '')}.us"


def _date_key(value: str) -> str:
    return value.replace("-", "")


def _fetch_prices(ticker: str, start_date: str, end_date: str, session: requests.Session) -> dict[str, float]:
    params = {
        "s": _stooq_symbol(ticker),
        "i": "d",
        "d1": _date_key(start_date),
        "d2": _date_key(end_date),
    }
    response = session.get(PRICE_SOURCE_URL, params=params, timeout=30)
    response.raise_for_status()
    rows = list(csv.DictReader(io.StringIO(response.text)))
    prices: dict[str, float] = {}
    for row in rows:
        if not row.get("Date") or not row.get("Close"):
            continue
        try:
            prices[row["Date"]] = float(row["Close"])
        except ValueError:
            continue
    return prices


def _price_on_or_after(prices: dict[str, float], target_date: str) -> float | None:
    for date in sorted(prices):
        if date >= target_date:
            return prices[date]
    return None


def _price_on_or_before(prices: dict[str, float], target_date: str) -> float | None:
    for date in sorted(prices, reverse=True):
        if date <= target_date:
            return prices[date]
    return None


def _weighted_interval_return(
    holdings: list[dict[str, Any]],
    prices_by_ticker: dict[str, dict[str, float]],
    start_date: str,
    end_date: str,
) -> tuple[float, set[str]]:
    weighted_returns: list[tuple[float, float]] = []
    missing: set[str] = set()

    for holding in holdings:
        ticker = holding.get("ticker")
        if not ticker:
            continue
        prices = prices_by_ticker.get(ticker, {})
        start_price = _price_on_or_after(prices, start_date)
        end_price = _price_on_or_before(prices, end_date)
        if not start_price or not end_price:
            missing.add(ticker)
            continue
        weighted_returns.append((holding.get("portfolioWeight", 0) / 100, (end_price / start_price) - 1))

    included_weight = sum(weight for weight, _ in weighted_returns)
    if not weighted_returns or included_weight == 0:
        return 0, missing

    normalized_return = sum((weight / included_weight) * interval_return for weight, interval_return in weighted_returns)
    return normalized_return, missing


def build_performance(quarters: list[dict[str, Any]], session: requests.Session) -> dict[str, Any]:
    chronological = sorted(quarters, key=lambda quarter: quarter["reportDate"])
    start_date = chronological[0]["reportDate"]
    end_date = chronological[-1]["reportDate"]
    tickers = sorted(
        {
            holding["ticker"]
            for quarter in chronological
            for holding in quarter.get("holdings", [])
            if holding.get("ticker")
        }
        | {BENCHMARK_TICKER}
    )

    prices_by_ticker: dict[str, dict[str, float]] = {}
    price_failures: set[str] = set()
    for ticker in tickers:
        try:
            prices_by_ticker[ticker] = _fetch_prices(ticker, start_date, end_date, session)
            if not prices_by_ticker[ticker]:
                price_failures.add(ticker)
        except requests.RequestException:
            prices_by_ticker[ticker] = {}
            price_failures.add(ticker)

    portfolio_value = 1.0
    benchmark_value = 1.0
    points = [
        {
            "date": start_date,
            "portfolioValue": portfolio_value,
            "benchmarkValue": benchmark_value,
            "portfolioReturn": 0,
            "benchmarkReturn": 0,
            "excessReturn": 0,
        }
    ]
    quarterly_returns = []
    missing_symbols = set(price_failures)

    for index in range(len(chronological) - 1):
        quarter = chronological[index]
        next_quarter = chronological[index + 1]
        interval_start = quarter["reportDate"]
        interval_end = next_quarter["reportDate"]
        portfolio_return, interval_missing = _weighted_interval_return(
            quarter.get("holdings", []),
            prices_by_ticker,
            interval_start,
            interval_end,
        )
        missing_symbols.update(interval_missing)

        spy_prices = prices_by_ticker.get(BENCHMARK_TICKER, {})
        spy_start = _price_on_or_after(spy_prices, interval_start)
        spy_end = _price_on_or_before(spy_prices, interval_end)
        benchmark_return = (spy_end / spy_start) - 1 if spy_start and spy_end else 0
        if not spy_start or not spy_end:
            missing_symbols.add(BENCHMARK_TICKER)

        portfolio_value *= 1 + portfolio_return
        benchmark_value *= 1 + benchmark_return
        excess_return = portfolio_return - benchmark_return
        point = {
            "date": interval_end,
            "portfolioValue": round(portfolio_value, 6),
            "benchmarkValue": round(benchmark_value, 6),
            "portfolioReturn": round(portfolio_return, 6),
            "benchmarkReturn": round(benchmark_return, 6),
            "excessReturn": round(excess_return, 6),
        }
        points.append(point)
        quarterly_returns.append(
            {
                "startDate": interval_start,
                "endDate": interval_end,
                **point,
            }
        )

    return {
        "startDate": start_date,
        "endDate": end_date,
        "benchmarkTicker": BENCHMARK_TICKER,
        "points": points,
        "quarterlyReturns": quarterly_returns,
        "missingSymbols": sorted(missing_symbols),
        "generatedAt": datetime.now(UTC).isoformat(),
        "methodology": [
            "Estimated Berkshire 13F portfolio return using disclosed quarter-end portfolio weights.",
            "Portfolio is rebalanced at each 13F report date and held until the next report date.",
            "SPY is used as the broad U.S. equity market benchmark.",
            "Price data comes from a no-key public CSV source and uses close prices when adjusted close is unavailable.",
            "This is not Berkshire Hathaway's actual investment performance and does not include cash, non-13F assets, or undisclosed intraperiod trades.",
        ],
        "priceSource": PRICE_SOURCE,
    }
