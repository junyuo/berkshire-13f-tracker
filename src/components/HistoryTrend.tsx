import type { HistoryItem } from "../types/holding";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function HistoryTrend({ history }: { history: HistoryItem[] }) {
  const oldestFirst = [...history].reverse();
  const maxValue = Math.max(...oldestFirst.map((quarter) => quarter.totalValue), 1);
  const maxCount = Math.max(...oldestFirst.map((quarter) => quarter.holdingsCount), 1);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">8-Quarter Trend</h2>
      <p className="text-sm text-stone-500">Reported market value and number of holdings.</p>
      <div className="mt-5 space-y-4">
        {oldestFirst.map((quarter) => (
          <a key={quarter.reportDate} href={quarter.secUrl ?? "#"} target="_blank" rel="noreferrer" className="block">
            <div className="grid gap-2 md:grid-cols-[96px_1fr_64px] md:items-center">
              <p className="text-sm font-medium text-stone-700">{quarter.reportDate}</p>
              <div className="space-y-1">
                <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-moss" style={{ width: `${(quarter.totalValue / maxValue) * 100}%` }} />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-brass" style={{ width: `${(quarter.holdingsCount / maxCount) * 100}%` }} />
                </div>
              </div>
              <div className="text-sm text-stone-600 md:text-right">
                <p>{money(quarter.totalValue)}</p>
                <p className="text-xs text-stone-400">{quarter.holdingsCount} holdings</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
