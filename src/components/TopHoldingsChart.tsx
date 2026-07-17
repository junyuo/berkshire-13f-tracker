import { useLanguage } from "../i18n";
import type { Holding } from "../types/holding";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function deltaClass(delta: number): string {
  if (delta > 0) return "text-emerald-700";
  if (delta < 0) return "text-red-700";
  return "text-stone-500";
}

export default function TopHoldingsChart({
  holdings,
  previousHoldings = [],
}: {
  holdings: Holding[];
  previousHoldings?: Holding[];
}) {
  const { t } = useLanguage();
  const topHoldings = holdings.slice(0, 10);
  const maxWeight = Math.max(...topHoldings.map((holding) => holding.portfolioWeight), 1);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("portfolioAllocationMap")}</h2>
          <p className="text-sm text-stone-500">{t("allocationMapSubtitle")}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {topHoldings.map((holding) => {
          const previous = previousHoldings.find((item) => item.cusip === holding.cusip);
          const weightDelta = holding.portfolioWeight - (previous?.portfolioWeight ?? 0);
          return (
            <div key={holding.cusip ?? holding.issuerName ?? "holding"} className="rounded-md border border-stone-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{holding.ticker ?? holding.issuerName}</p>
                  <p className="truncate text-xs text-stone-500">{holding.issuerName}</p>
                </div>
                <p className="text-right text-sm font-semibold text-ink">{holding.portfolioWeight.toFixed(2)}%</p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-moss"
                  style={{ width: `${Math.max((holding.portfolioWeight / maxWeight) * 100, 3)}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className="text-stone-500">{t("qoqWeight")}</span>
                <span className={`font-medium ${deltaClass(weightDelta)}`}>
                  {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(2)} {t("points")}
                </span>
              </div>
              <p className="mt-2 text-right text-xs text-stone-500">{money(holding.value)}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 space-y-3">
        {topHoldings.slice(0, 5).map((holding) => (
          <div key={`${holding.cusip}-bar`} className="grid gap-2 md:grid-cols-[180px_1fr_96px] md:items-center">
            <p className="truncate text-sm font-medium text-ink">{holding.ticker ?? holding.issuerName}</p>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-moss"
                style={{ width: `${Math.max((holding.portfolioWeight / maxWeight) * 100, 3)}%` }}
              />
            </div>
            <p className="text-right text-sm text-stone-600">{holding.portfolioWeight.toFixed(2)}%</p>
          </div>
        ))}
      </div>
    </section>
  );
}
