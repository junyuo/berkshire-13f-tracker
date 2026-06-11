import ChangesTable from "../components/ChangesTable";
import ConcentrationCards from "../components/ConcentrationCards";
import DashboardCards from "../components/DashboardCards";
import HistoryTrend from "../components/HistoryTrend";
import MeaningfulMoves from "../components/MeaningfulMoves";
import PerformanceSummaryCard from "../components/PerformanceSummaryCard";
import QuarterlySummary from "../components/QuarterlySummary";
import TopHoldingsChart from "../components/TopHoldingsChart";
import type { Holding, HistoryItem, LatestData, PerformanceData, QuarterData } from "../types/holding";

export default function Dashboard({
  latest,
  history,
  changes,
  quarters,
  performance,
}: {
  latest: LatestData;
  history: HistoryItem[];
  changes: Holding[];
  quarters: QuarterData[];
  performance: PerformanceData | null;
}) {
  const visibleChanges = changes.filter((holding) => holding.action !== "Unchanged").slice(0, 8);
  const previousHoldings = quarters[1]?.holdings ?? [];

  return (
    <div className="space-y-6">
      <DashboardCards latest={latest} />
      <ConcentrationCards holdings={latest.holdings} previousHoldings={previousHoldings} />
      <PerformanceSummaryCard performance={performance} />
      <QuarterlySummary changes={changes} />
      <MeaningfulMoves changes={changes} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <TopHoldingsChart holdings={latest.holdings} />
        <HistoryTrend history={history} />
      </div>
      <ChangesTable changes={visibleChanges} action="All" onActionChange={() => undefined} showFilter={false} />
      <section className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-600 shadow-sm">
        <h2 className="text-base font-semibold text-ink">About 13F Data</h2>
        <dl className="mt-3 grid gap-3 md:grid-cols-5">
          <div>
            <dt className="font-medium text-ink">New Position</dt>
            <dd>Not held last quarter, held this quarter.</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Added</dt>
            <dd>Held in both quarters, shares increased.</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Reduced</dt>
            <dd>Held in both quarters, shares decreased.</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Sold Out</dt>
            <dd>Held last quarter, absent this quarter.</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Unchanged</dt>
            <dd>Share count did not change.</dd>
          </div>
        </dl>
        <ul className="mt-5 grid gap-2 border-t border-stone-200 pt-4 md:grid-cols-2">
          <li>13F filings are delayed and do not show real-time Berkshire Hathaway holdings.</li>
          <li>Reports may exclude cash, some derivatives, and some non-U.S. ordinary shares.</li>
          <li>Reported values reflect the SEC filing data and are not Berkshire's cost basis.</li>
          <li>Value change can be driven by market price movement; share change is the cleaner buy/sell signal.</li>
          <li>Tickers use a local CUSIP mapping and remain blank when no reliable mapping is available.</li>
        </ul>
      </section>
    </div>
  );
}
