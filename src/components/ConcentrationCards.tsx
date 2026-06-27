import { Layers } from "lucide-react";
import type { Holding } from "../types/holding";

function weight(holdings: Holding[], count: number): number {
  return holdings.slice(0, count).reduce((sum, holding) => sum + holding.portfolioWeight, 0);
}

function deltaLabel(delta: number): string {
  if (Math.abs(delta) < 0.005) return "Flat QoQ";
  return `${delta > 0 ? "+" : ""}${delta.toFixed(2)} pts QoQ`;
}

function deltaClass(delta: number): string {
  if (delta > 0) return "text-emerald-700";
  if (delta < 0) return "text-red-700";
  return "text-stone-500";
}

export default function ConcentrationCards({ holdings, previousHoldings }: { holdings: Holding[]; previousHoldings: Holding[] }) {
  const top5 = weight(holdings, 5);
  const top10 = weight(holdings, 10);
  const previousTop5 = weight(previousHoldings, 5);
  const previousTop10 = weight(previousHoldings, 10);
  const segments = [
    { label: "Top 5", value: top5, className: "bg-moss" },
    { label: "Top 6-10", value: Math.max(top10 - top5, 0), className: "bg-brass" },
    { label: "Other", value: Math.max(100 - top10, 0), className: "bg-stone-300" },
  ];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ink">Portfolio Snapshot</h2>
          <p className="text-sm text-stone-500">How concentrated the latest reported 13F portfolio is.</p>
        </div>
        <Layers className="h-5 w-5 text-brass" />
      </div>

      <div className="mt-5 overflow-hidden rounded-full bg-stone-100" aria-label="Portfolio concentration by weight">
        <div className="flex h-5 w-full">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className={`${segment.className} min-w-[2px]`}
              style={{ width: `${segment.value}%` }}
              title={`${segment.label}: ${segment.value.toFixed(2)}%`}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {segments.map((segment) => (
          <div key={segment.label} className="rounded-md border border-stone-200 p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${segment.className}`} />
              <p className="text-sm font-medium text-stone-600">{segment.label}</p>
            </div>
            <p className="mt-2 text-xl font-semibold text-ink">{segment.value.toFixed(2)}%</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 border-t border-stone-200 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Top 5 concentration</p>
          <p className="mt-1 text-sm text-stone-700">
            {top5.toFixed(2)}% <span className={deltaClass(top5 - previousTop5)}>{deltaLabel(top5 - previousTop5)}</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Top 10 concentration</p>
          <p className="mt-1 text-sm text-stone-700">
            {top10.toFixed(2)}% <span className={deltaClass(top10 - previousTop10)}>{deltaLabel(top10 - previousTop10)}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
