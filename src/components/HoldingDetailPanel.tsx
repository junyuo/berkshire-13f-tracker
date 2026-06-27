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

function timelineState(current: Holding | undefined, previous: Holding | undefined): { label: string; className: string } {
  if (!current) return { label: "Not held", className: "border-stone-300 bg-white text-stone-400" };
  if (!previous) return { label: "New", className: "border-blue-600 bg-blue-600 text-white" };
  if (current.shares > previous.shares) return { label: "Added", className: "border-emerald-600 bg-emerald-600 text-white" };
  if (current.shares < previous.shares) return { label: "Reduced", className: "border-red-600 bg-red-600 text-white" };
  return { label: "Held", className: "border-moss bg-moss text-white" };
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
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">Recent trend</p>
              <p className="mt-1 font-semibold text-ink">{holding.trend ?? "-"}</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">Held in 8 quarters</p>
              <p className="mt-1 font-semibold text-ink">{holding.quartersHeld ?? 0} quarters</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">Consecutive held</p>
              <p className="mt-1 font-semibold text-ink">{holding.consecutiveQuartersHeld ?? 0} quarters</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">Share change</p>
              <p className="mt-1 font-semibold text-ink">
                {holding.shareChangePercent == null ? "-" : `${holding.shareChangePercent.toFixed(2)}%`}
              </p>
            </div>
          </div>

          <section className="mt-6">
            <div>
              <h3 className="text-base font-semibold text-ink">8-Quarter Holding Timeline</h3>
              <p className="text-sm text-stone-500">Quarter-by-quarter holding status based on reported share count.</p>
            </div>
            <div className="mt-4 overflow-x-auto pb-2">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-8 items-start gap-2">
                  {history.map(({ quarter, holding: quarterHolding }, index) => {
                    const previousHolding = index > 0 ? history[index - 1].holding : undefined;
                    const state = timelineState(quarterHolding, previousHolding);
                    const reportDate = quarter.reportDate ?? "Unknown";
                    return (
                      <div key={reportDate} className="relative text-center">
                        {index > 0 ? <span className="absolute left-[-50%] top-4 h-px w-full bg-stone-200" /> : null}
                        <div
                          className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-semibold ${state.className}`}
                          title={`${reportDate}: ${state.label}`}
                        >
                          {quarterHolding ? "✓" : ""}
                        </div>
                        <p className="mt-2 text-xs font-medium text-stone-700">{reportDate.slice(0, 7)}</p>
                        <p className="mt-1 text-xs text-stone-500">{state.label}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 grid grid-cols-8 gap-2">
                  {history.map(({ quarter, holding: quarterHolding }) => (
                    <div key={`${quarter.reportDate}-detail`} className="rounded-md bg-stone-50 p-2 text-center">
                      <p className="text-xs font-medium text-ink">{quarterHolding ? `${quarterHolding.portfolioWeight.toFixed(2)}%` : "-"}</p>
                      <p className="mt-1 text-[11px] text-stone-500">{quarterHolding ? money(quarterHolding.value) : "Not held"}</p>
                      <p className="mt-1 text-[11px] text-stone-400">
                        {quarterHolding ? `${quarterHolding.shares.toLocaleString("en-US")} sh` : ""}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-600">
                  {[
                    { label: "Held", className: "bg-moss" },
                    { label: "Added", className: "bg-emerald-600" },
                    { label: "Reduced", className: "bg-red-600" },
                    { label: "New", className: "bg-blue-600" },
                    { label: "Not held", className: "border border-stone-300 bg-white" },
                  ].map((item) => (
                    <span key={item.label} className="inline-flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-base font-semibold text-ink">Recent Quarter Detail</h3>
            <div className="mt-4 space-y-3">
              {history.map(({ quarter, holding: quarterHolding }, index) => {
                const previousHolding = index > 0 ? history[index - 1].holding : undefined;
                const state = timelineState(quarterHolding, previousHolding);
                return (
                <div key={quarter.reportDate} className="grid gap-2 md:grid-cols-[96px_120px_1fr_150px] md:items-center">
                  <p className="text-sm font-medium text-stone-700">{quarter.reportDate}</p>
                  <p className="text-xs font-medium text-stone-500">{state.label}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full ${quarterHolding ? "bg-moss" : "bg-transparent"}`}
                      style={{ width: `${quarterHolding ? Math.max(quarterHolding.portfolioWeight, 1) : 0}%` }}
                    />
                  </div>
                  <div className="text-sm text-stone-600 md:text-right">
                    <p>{quarterHolding ? money(quarterHolding.value) : "Not held"}</p>
                    <p className="text-xs text-stone-400">
                      {quarterHolding ? `${quarterHolding.shares.toLocaleString("en-US")} shares` : ""}
                    </p>
                  </div>
                </div>
                );
              })}
            </div>
          </section>

          <section className="mt-6 rounded-md bg-stone-50 p-4 text-sm text-stone-600">
            <p>
              Current reported value: <span className="font-medium text-ink">{fullMoney(holding.value)}</span>. 13F data
              is delayed and does not represent real-time portfolio activity. Value changes can reflect market price movement;
              share changes are the better signal for buying or selling behavior.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
