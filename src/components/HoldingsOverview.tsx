import type { HoldingTrend } from "../types/holding";
import { useLanguage } from "../i18n";
import type { Holding } from "../types/holding";

type TrendFilter = HoldingTrend | "All";

function weight(holdings: Holding[], count: number): number {
  return holdings.slice(0, count).reduce((sum, holding) => sum + holding.portfolioWeight, 0);
}

export default function HoldingsOverview({
  holdings,
  trendFilter,
  onTrendFilterChange,
}: {
  holdings: Holding[];
  trendFilter: TrendFilter;
  onTrendFilterChange: (trend: TrendFilter) => void;
}) {
  const { t, trendLabel } = useLanguage();
  const top5 = weight(holdings, 5);
  const top10 = weight(holdings, 10);
  const largest = holdings[0]?.portfolioWeight ?? 0;
  const coreHoldings = holdings.filter((holding) => (holding.consecutiveQuartersHeld ?? 0) >= 6 || (holding.quartersHeld ?? 0) >= 6).length;
  const segments = [
    { label: t("top5"), value: top5, className: "bg-moss" },
    { label: t("top6To10"), value: Math.max(top10 - top5, 0), className: "bg-brass" },
    { label: t("other"), value: Math.max(100 - top10, 0), className: "bg-stone-300" },
  ];
  const trends = Array.from(new Set(holdings.map((holding) => holding.trend).filter(Boolean))) as HoldingTrend[];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("holdingsOverview")}</h2>
          <p className="text-sm text-stone-500">{t("weightDistribution")}</p>
        </div>
        <div className="grid gap-3 text-right sm:grid-cols-3 lg:min-w-[420px]">
          <div>
            <p className="text-xs text-stone-500">{t("top10Weight")}</p>
            <p className="font-semibold text-ink">{top10.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">{t("largestWeight")}</p>
            <p className="font-semibold text-ink">{largest.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">{t("coreHoldings")}</p>
            <p className="font-semibold text-ink">{coreHoldings.toLocaleString("en-US")}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-full bg-stone-100">
        <div className="flex h-4">
          {segments.map((segment) => (
            <div key={segment.label} className={`${segment.className} min-w-[2px]`} style={{ width: `${segment.value}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-600">
        {segments.map((segment) => (
          <span key={segment.label} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${segment.className}`} />
            {segment.label} {segment.value.toFixed(2)}%
          </span>
        ))}
      </div>

      <div className="mt-5 border-t border-stone-200 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t("trendMix")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${
              trendFilter === "All" ? "bg-ink text-white ring-ink" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
            }`}
            onClick={() => onTrendFilterChange("All")}
          >
            {t("allTrends")} ({holdings.length})
          </button>
          {trends.map((trend) => {
            const count = holdings.filter((holding) => holding.trend === trend).length;
            return (
              <button
                key={trend}
                className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${
                  trendFilter === trend ? "bg-ink text-white ring-ink" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
                }`}
                onClick={() => onTrendFilterChange(trend)}
              >
                {trendLabel(trend)} ({count})
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export type { TrendFilter };
