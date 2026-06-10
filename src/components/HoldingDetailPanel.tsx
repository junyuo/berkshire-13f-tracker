import { X } from "lucide-react";
import type { Holding, QuarterData } from "../types/holding";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function fullMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function findHolding(quarter: QuarterData, cusip: string | null): Holding | undefined {
  return quarter.holdings.find((holding) => holding.cusip === cusip);
}

export default function HoldingDetailPanel({
  holding,
  quarters,
  onClose,
}: {
  holding: Holding | null;
  quarters: QuarterData[];
  onClose: () => void;
}) {
  if (!holding) return null;

  const history = quarters
    .map((quarter) => ({
      quarter,
      holding: findHolding(quarter, holding.cusip),
    }))
    .reverse();
  const maxValue = Math.max(...history.map((item) => item.holding?.value ?? 0), 1);

  return (
    <div className="fixed inset-0 z-50 bg-ink/25 px-4 py-6 backdrop-blur-sm sm:px-6" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
          <div>
            <p className="text-sm font-medium text-brass">{holding.ticker ?? holding.cusip}</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">{holding.issuerName}</h2>
            <p className="mt-1 font-mono text-xs text-stone-500">CUSIP {holding.cusip}</p>
          </div>
          <button
            className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-ink"
            onClick={onClose}
            aria-label="Close holding details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">Market value</p>
              <p className="mt-1 font-semibold text-ink">{money(holding.value)}</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">Shares</p>
              <p className="mt-1 font-semibold text-ink">{holding.shares.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">Weight</p>
              <p className="mt-1 font-semibold text-ink">{holding.portfolioWeight.toFixed(2)}%</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">Latest action</p>
              <p className="mt-1 font-semibold text-ink">{holding.action}</p>
            </div>
          </div>

          <section className="mt-6">
            <h3 className="text-base font-semibold text-ink">8-Quarter Trend</h3>
            <div className="mt-4 space-y-3">
              {history.map(({ quarter, holding: quarterHolding }) => (
                <div key={quarter.reportDate} className="grid gap-2 md:grid-cols-[96px_1fr_150px] md:items-center">
                  <p className="text-sm font-medium text-stone-700">{quarter.reportDate}</p>
                  <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-moss"
                      style={{ width: `${Math.max(((quarterHolding?.value ?? 0) / maxValue) * 100, quarterHolding ? 2 : 0)}%` }}
                    />
                  </div>
                  <div className="text-sm text-stone-600 md:text-right">
                    <p>{quarterHolding ? money(quarterHolding.value) : "Not held"}</p>
                    <p className="text-xs text-stone-400">
                      {quarterHolding ? `${quarterHolding.shares.toLocaleString("en-US")} shares` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-md bg-stone-50 p-4 text-sm text-stone-600">
            <p>
              Current reported value: <span className="font-medium text-ink">{fullMoney(holding.value)}</span>. 13F data
              is delayed and does not represent real-time portfolio activity.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
