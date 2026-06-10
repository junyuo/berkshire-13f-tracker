import type { Holding } from "../types/holding";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function TopHoldingsChart({ holdings }: { holdings: Holding[] }) {
  const topHoldings = holdings.slice(0, 10);
  const maxValue = Math.max(...topHoldings.map((holding) => holding.value), 1);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Top 10 Holdings</h2>
          <p className="text-sm text-stone-500">Ranked by reported market value.</p>
        </div>
      </div>
      <div className="space-y-4">
        {topHoldings.map((holding) => (
          <div key={holding.cusip ?? holding.issuerName ?? "holding"} className="grid gap-2 md:grid-cols-[220px_1fr_120px] md:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{holding.issuerName}</p>
              <p className="text-xs text-stone-500">{holding.portfolioWeight.toFixed(2)}% of portfolio</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-moss"
                style={{ width: `${Math.max((holding.value / maxValue) * 100, 2)}%` }}
              />
            </div>
            <p className="text-sm font-medium text-stone-700 md:text-right">{money(holding.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
