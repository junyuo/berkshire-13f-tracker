import ChangesTable from "../components/ChangesTable";
import DashboardCards from "../components/DashboardCards";
import QuarterlySummary from "../components/QuarterlySummary";
import TopHoldingsChart from "../components/TopHoldingsChart";
import type { Holding, HistoryItem, LatestData } from "../types/holding";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Dashboard({
  latest,
  history,
  changes,
}: {
  latest: LatestData;
  history: HistoryItem[];
  changes: Holding[];
}) {
  const visibleChanges = changes.filter((holding) => holding.action !== "Unchanged").slice(0, 8);

  return (
    <div className="space-y-6">
      <DashboardCards latest={latest} />
      <QuarterlySummary changes={changes} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <TopHoldingsChart holdings={latest.holdings} />
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Quarter History</h2>
          <div className="mt-4 space-y-4">
            {history.map((quarter) => (
              <a
                key={`${quarter.reportDate}-${quarter.filingDate}`}
                className="block rounded-md border border-stone-200 p-4 hover:border-moss"
                href={quarter.secUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{quarter.reportDate}</p>
                  <p className="text-sm text-stone-500">{quarter.filingDate}</p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-stone-600">
                  <span>{money(quarter.totalValue)}</span>
                  <span>{quarter.holdingsCount} holdings</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
      <ChangesTable changes={visibleChanges} action="All" onActionChange={() => undefined} showFilter={false} />
      <section className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-600 shadow-sm">
        <h2 className="text-base font-semibold text-ink">Data Notes</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          <li>13F filings are delayed and do not show real-time Berkshire Hathaway holdings.</li>
          <li>Reports may exclude cash, some derivatives, and some non-U.S. ordinary shares.</li>
          <li>Reported values reflect the SEC filing data and are not Berkshire's cost basis.</li>
          <li>Tickers remain blank when they cannot be reliably derived from SEC data.</li>
        </ul>
      </section>
    </div>
  );
}
