from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from statistics import fmean
from typing import Any

try:
    import requests
except ModuleNotFoundError:  # Pure calculation tests do not require the HTTP client.
    requests = None  # type: ignore[assignment]

from compare_quarters import compare_quarters


DATA_DIR = Path(__file__).resolve().parents[1] / "public" / "data"
OFFICIAL_COST_PATH = DATA_DIR / "official_cost_basis.json"
MIN_INTERVAL_OBSERVATIONS = 40
ENDPOINT_TOLERANCE_DAYS = 7
PRICE_SOURCE_URL = "https://stooq.com/q/d/l/"
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
NASDAQ_HISTORY_URL = "https://api.nasdaq.com/api/quote/{symbol}/historical"
YAHOO_SYMBOL_BY_TICKER = {"LEN.B": "LEN-B"}
REQUEST_ERRORS = (KeyError, TypeError, ValueError, OSError) + ((requests.RequestException,) if requests else ())


def _stooq_symbol(ticker: str) -> str:
    return f"{ticker.lower().replace('.', '')}.us"


def _yahoo_symbol(ticker: str) -> str:
    return YAHOO_SYMBOL_BY_TICKER.get(ticker, ticker.replace(".", "-"))


def _date_key(value: str) -> str:
    return value.replace("-", "")


def _timestamp(value: str, end_of_day: bool = False) -> int:
    parsed = datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
    if end_of_day:
        parsed += timedelta(days=1)
    return int(parsed.timestamp())


def create_price_session(max_attempts: int = 3) -> Any:
    if requests is None:
        raise RuntimeError("The requests package is required to fetch market prices.")
    if not 1 <= max_attempts <= 3:
        raise ValueError("max_attempts must be between 1 and 3")
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry

    session = requests.Session()
    session.headers.update({"User-Agent": "berkshire-13f-tracker/0.1 contact@example.com"})
    session.mount(
        "https://",
        HTTPAdapter(
            max_retries=Retry(
                total=max_attempts - 1,
                backoff_factor=0.8,
                status_forcelist=(429, 500, 502, 503, 504),
                allowed_methods=("GET",),
            )
        ),
    )
    return session


@dataclass(frozen=True)
class SplitEvent:
    event_date: str
    ratio: float


@dataclass(frozen=True)
class PriceHistory:
    closes: dict[str, float]
    splits: tuple[SplitEvent, ...] = ()


@dataclass(frozen=True)
class IntervalStats:
    average: float
    low: float
    high: float
    split_factor: float


def unavailable(reason: str) -> dict[str, Any]:
    return {
        "status": "unavailable",
        "basis": None,
        "basisLow": None,
        "basisHigh": None,
        "averagePrice": None,
        "method": None,
        "sourceAsOf": None,
        "sourceUrl": None,
        "reason": reason,
    }


def _available_cost(
    status: str,
    basis: float,
    basis_low: float,
    basis_high: float,
    shares: int,
    method: str,
    source_as_of: str | None = None,
    source_url: str | None = None,
) -> dict[str, Any]:
    rounded_basis = round(basis, 2)
    return {
        "status": status,
        "basis": rounded_basis,
        "basisLow": round(basis_low, 2),
        "basisHigh": round(basis_high, 2),
        "averagePrice": round(rounded_basis / shares, 6),
        "method": method,
        "sourceAsOf": source_as_of,
        "sourceUrl": source_url,
        "reason": None,
    }


def load_official_costs(path: Path = OFFICIAL_COST_PATH) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    required_root = ("sourceLabel", "sourceUrl", "sourceAsOf", "amountPrecision", "holdings")
    if any(field not in data for field in required_root):
        raise ValueError("Official cost data is missing required metadata.")
    if not isinstance(data["holdings"], list) or not data["holdings"]:
        raise ValueError("Official cost data must contain holdings.")
    for holding in data["holdings"]:
        if not all(holding.get(field) for field in ("ticker", "cusip", "shares", "basis")):
            raise ValueError("Official cost holding is missing ticker, CUSIP, shares, or basis.")
    return data


def _fetch_yahoo_history(ticker: str, start_date: str, end_date: str, session: Any) -> PriceHistory:
    params = {
        "period1": _timestamp(start_date),
        "period2": _timestamp(end_date, end_of_day=True),
        "interval": "1d",
        "events": "history,splits",
    }
    response = session.get(YAHOO_CHART_URL.format(symbol=_yahoo_symbol(ticker)), params=params, timeout=30)
    response.raise_for_status()
    result = response.json()["chart"]["result"]
    if not result:
        return PriceHistory({})

    payload = result[0]
    timestamps = payload.get("timestamp", [])
    closes = payload.get("indicators", {}).get("quote", [{}])[0].get("close", [])
    by_date = {
        datetime.fromtimestamp(timestamp, tz=timezone.utc).date().isoformat(): float(close)
        for timestamp, close in zip(timestamps, closes)
        if close is not None and close > 0
    }
    split_events = []
    for event in payload.get("events", {}).get("splits", {}).values():
        numerator = event.get("numerator")
        denominator = event.get("denominator")
        event_timestamp = event.get("date")
        if not numerator or not denominator or not event_timestamp:
            continue
        split_events.append(
            SplitEvent(
                datetime.fromtimestamp(event_timestamp, tz=timezone.utc).date().isoformat(),
                float(numerator) / float(denominator),
            )
        )
    return PriceHistory(by_date, tuple(sorted(split_events, key=lambda event: event.event_date)))


def _fetch_stooq_history(ticker: str, start_date: str, end_date: str, session: Any) -> PriceHistory:
    params = {"s": _stooq_symbol(ticker), "i": "d", "d1": _date_key(start_date), "d2": _date_key(end_date)}
    response = session.get(PRICE_SOURCE_URL, params=params, timeout=30)
    response.raise_for_status()
    closes: dict[str, float] = {}
    for row in csv.DictReader(io.StringIO(response.text)):
        try:
            close = float(row.get("Close", ""))
        except ValueError:
            continue
        if row.get("Date") and close > 0:
            closes[row["Date"]] = close
    return PriceHistory(closes)


def _fetch_nasdaq_history(ticker: str, start_date: str, end_date: str, session: Any) -> PriceHistory:
    params = {
        "assetclass": "stocks",
        "fromdate": start_date,
        "todate": end_date,
        "limit": 5000,
    }
    headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json, text/plain, */*"}
    response = session.get(
        NASDAQ_HISTORY_URL.format(symbol=_yahoo_symbol(ticker)),
        params=params,
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    rows = response.json().get("data", {}).get("tradesTable", {}).get("rows", [])
    closes: dict[str, float] = {}
    for row in rows or []:
        raw_date = row.get("date")
        raw_close = row.get("close")
        if not raw_date or not raw_close:
            continue
        try:
            day = datetime.strptime(raw_date, "%m/%d/%Y").date().isoformat()
            close = float(raw_close.replace("$", "").replace(",", ""))
        except (TypeError, ValueError):
            continue
        if close > 0:
            closes[day] = close
    return PriceHistory(closes)


def fetch_price_history(ticker: str, start_date: str, end_date: str, session: Any) -> PriceHistory:
    try:
        history = _fetch_yahoo_history(ticker, start_date, end_date, session)
        if history.closes:
            return history
    except REQUEST_ERRORS:
        pass
    try:
        history = _fetch_nasdaq_history(ticker, start_date, end_date, session)
        if history.closes:
            return history
    except REQUEST_ERRORS:
        pass
    try:
        return _fetch_stooq_history(ticker, start_date, end_date, session)
    except REQUEST_ERRORS:
        return PriceHistory({})


def fetch_cost_price_histories(
    quarters: list[dict[str, Any]],
    session: Any,
    official_data: dict[str, Any] | None = None,
) -> dict[str, PriceHistory]:
    chronological = sorted(quarters, key=lambda quarter: quarter["reportDate"])
    official_cusips = {holding["cusip"] for holding in (official_data or {}).get("holdings", [])}
    oldest_cusips = {holding.get("cusip") for holding in chronological[0].get("holdings", [])}
    tickers: set[str] = set()
    previous_by_cusip: dict[str, dict[str, Any]] = {}
    for quarter in chronological:
        for holding in quarter.get("holdings", []):
            ticker = holding.get("ticker")
            cusip = holding.get("cusip")
            previous = previous_by_cusip.get(cusip)
            entered_during_window = cusip not in oldest_cusips
            official_position_changed = cusip in official_cusips and previous and holding.get("shares") != previous.get("shares")
            if ticker and (entered_during_window or official_position_changed):
                tickers.add(ticker)
        previous_by_cusip = {
            holding.get("cusip"): holding
            for holding in quarter.get("holdings", [])
            if holding.get("cusip")
        }
    return {
        ticker: fetch_price_history(ticker, chronological[0]["reportDate"], chronological[-1]["reportDate"], session)
        for ticker in sorted(tickers)
    }


def _split_factor(history: PriceHistory, start_date: str, end_date: str) -> float:
    factor = 1.0
    for event in history.splits:
        if start_date < event.event_date <= end_date:
            factor *= event.ratio
    return factor


def _interval_stats(history: PriceHistory | None, start_date: str, end_date: str) -> IntervalStats | None:
    if not history:
        return None
    interval_dates = sorted(day for day in history.closes if start_date < day <= end_date)
    if len(interval_dates) < MIN_INTERVAL_OBSERVATIONS:
        return None
    if date.fromisoformat(interval_dates[0]) > date.fromisoformat(start_date) + timedelta(days=ENDPOINT_TOLERANCE_DAYS):
        return None
    if date.fromisoformat(interval_dates[-1]) < date.fromisoformat(end_date) - timedelta(days=ENDPOINT_TOLERANCE_DAYS):
        return None

    adjusted_prices = []
    for day in interval_dates:
        future_split_factor = _split_factor(history, day, end_date)
        adjusted_prices.append(history.closes[day] / future_split_factor)
    return IntervalStats(
        average=fmean(adjusted_prices),
        low=min(adjusted_prices),
        high=max(adjusted_prices),
        split_factor=_split_factor(history, start_date, end_date),
    )


def _normalized_issuer(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


def _has_ambiguous_predecessor(current: dict[str, Any], previous_holdings: list[dict[str, Any]]) -> bool:
    current_issuer = _normalized_issuer(current.get("issuerName"))
    current_ticker = current.get("ticker")
    for previous in previous_holdings:
        if previous.get("cusip") == current.get("cusip"):
            continue
        same_ticker = current_ticker and previous.get("ticker") == current_ticker
        same_issuer = current_issuer and _normalized_issuer(previous.get("issuerName")) == current_issuer
        if same_ticker or same_issuer:
            return True
    return False


def _looks_like_unreported_split(previous: dict[str, Any], current: dict[str, Any], split_factor: float) -> bool:
    if split_factor != 1 or previous.get("shares", 0) <= 0 or previous.get("value", 0) <= 0:
        return False
    share_ratio = current.get("shares", 0) / previous["shares"]
    common_ratios = (0.1, 0.2, 0.25, 0.5, 2, 3, 4, 5, 10)
    resembles_common_split = any(abs(share_ratio - ratio) / ratio <= 0.02 for ratio in common_ratios)
    value_ratio = current.get("value", 0) / previous["value"]
    return resembles_common_split and 0.8 <= value_ratio <= 1.2


def enrich_quarters_with_costs(
    quarters: list[dict[str, Any]],
    official_data: dict[str, Any],
    prices_by_ticker: dict[str, PriceHistory],
) -> list[dict[str, Any]]:
    chronological = sorted(quarters, key=lambda quarter: quarter["reportDate"])
    official_by_key = {
        (holding["cusip"], official_data["sourceAsOf"]): holding
        for holding in official_data["holdings"]
    }
    active_costs: dict[str, dict[str, Any]] = {}
    previous_quarter: dict[str, Any] | None = None

    for quarter in chronological:
        previous_by_cusip = {
            holding["cusip"]: holding
            for holding in (previous_quarter or {}).get("holdings", [])
            if holding.get("cusip")
        }
        next_active: dict[str, dict[str, Any]] = {}
        for holding in quarter.get("holdings", []):
            cusip = holding.get("cusip")
            ticker = holding.get("ticker")
            shares = holding.get("shares", 0)
            official = official_by_key.get((cusip, quarter["reportDate"]))

            if official:
                if shares != official["shares"]:
                    holding["cost"] = unavailable("corporate-action")
                    continue
                cost = _available_cost(
                    "official",
                    official["basis"],
                    official["basis"],
                    official["basis"],
                    shares,
                    "reported",
                    official_data["sourceAsOf"],
                    official_data["sourceUrl"],
                )
                holding["cost"] = cost
                next_active[cusip] = cost
                continue

            previous_holding = previous_by_cusip.get(cusip)
            previous_cost = active_costs.get(cusip)
            if previous_holding and previous_cost and previous_cost["status"] != "unavailable":
                previous_shares = previous_holding.get("shares", 0)
                if shares == previous_shares:
                    status = previous_cost["status"]
                    method = "reported-carried" if status == "official" else previous_cost["method"]
                    cost = _available_cost(
                        status,
                        previous_cost["basis"],
                        previous_cost["basisLow"],
                        previous_cost["basisHigh"],
                        shares,
                        method,
                        previous_cost["sourceAsOf"],
                        previous_cost["sourceUrl"],
                    )
                    holding["cost"] = cost
                    next_active[cusip] = cost
                    continue

                stats = _interval_stats(
                    prices_by_ticker.get(ticker),
                    previous_quarter["reportDate"],
                    quarter["reportDate"],
                )
                if not stats:
                    holding["cost"] = unavailable("missing-price")
                    continue
                normalized_previous_shares = round(previous_shares * stats.split_factor)
                share_delta = shares - normalized_previous_shares
                if _looks_like_unreported_split(previous_holding, holding, stats.split_factor):
                    holding["cost"] = unavailable("corporate-action")
                    continue
                if share_delta == 0:
                    status = previous_cost["status"]
                    method = "reported-carried" if status == "official" else previous_cost["method"]
                    cost = _available_cost(
                        status,
                        previous_cost["basis"],
                        previous_cost["basisLow"],
                        previous_cost["basisHigh"],
                        shares,
                        method,
                        previous_cost["sourceAsOf"],
                        previous_cost["sourceUrl"],
                    )
                    holding["cost"] = cost
                    next_active[cusip] = cost
                    continue
                if share_delta >= 0:
                    basis = previous_cost["basis"] + share_delta * stats.average
                    basis_low = previous_cost["basisLow"] + share_delta * stats.low
                    basis_high = previous_cost["basisHigh"] + share_delta * stats.high
                else:
                    remaining_ratio = shares / normalized_previous_shares if normalized_previous_shares else 0
                    basis = previous_cost["basis"] * remaining_ratio
                    basis_low = previous_cost["basisLow"] * remaining_ratio
                    basis_high = previous_cost["basisHigh"] * remaining_ratio
                status = "hybrid" if previous_cost["status"] in ("official", "hybrid") else "estimated"
                method = "reported-plus-estimates" if status == "hybrid" else "observed-period-estimate"
                cost = _available_cost(
                    status,
                    basis,
                    basis_low,
                    basis_high,
                    shares,
                    method,
                    previous_cost["sourceAsOf"],
                    previous_cost["sourceUrl"],
                )
                holding["cost"] = cost
                next_active[cusip] = cost
                continue

            if previous_holding or previous_quarter is None:
                holding["cost"] = unavailable("insufficient-history")
                continue
            if not ticker:
                holding["cost"] = unavailable("unsupported-security")
                continue
            if _has_ambiguous_predecessor(holding, previous_quarter.get("holdings", [])):
                holding["cost"] = unavailable("corporate-action")
                continue

            stats = _interval_stats(prices_by_ticker.get(ticker), previous_quarter["reportDate"], quarter["reportDate"])
            if not stats:
                holding["cost"] = unavailable("missing-price")
                continue
            cost = _available_cost(
                "estimated",
                shares * stats.average,
                shares * stats.low,
                shares * stats.high,
                shares,
                "observed-period-estimate",
            )
            holding["cost"] = cost
            next_active[cusip] = cost

        active_costs = next_active
        previous_quarter = quarter

    return sorted(chronological, key=lambda quarter: quarter["reportDate"], reverse=True)


def enrich_existing_data(data_dir: Path, session: Any) -> None:
    official_data = load_official_costs(data_dir / "official_cost_basis.json")
    quarters_path = data_dir / "quarters.json"
    quarters = json.loads(quarters_path.read_text(encoding="utf-8"))
    prices = fetch_cost_price_histories(quarters, session, official_data)
    enriched = enrich_quarters_with_costs(quarters, official_data, prices)
    latest = json.loads((data_dir / "latest.json").read_text(encoding="utf-8"))
    latest["holdings"] = enriched[0]["holdings"]
    changes = compare_quarters(enriched[0], enriched[1])
    for path, payload in (
        (quarters_path, enriched),
        (data_dir / "latest.json", latest),
        (data_dir / "changes.json", changes),
    ):
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Enrich the checked-in 13F snapshot with conservative cost estimates.")
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR)
    parser.add_argument("--max-attempts", type=int, default=3)
    args = parser.parse_args()
    enrich_existing_data(args.data_dir, create_price_session(args.max_attempts))
    return 0


if __name__ == "__main__":
    sys.exit(main())
