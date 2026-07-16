import { LineChart } from "lucide-react";
import { useLanguage } from "../i18n";
import type { PerformanceData } from "../types/holding";

function percent(value: number): string {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

export default function PerformanceSummaryCard({ performance }: { performance: PerformanceData | null }) {
  const { t } = useLanguage();
  if (!performance?.points.length) return null;

  const latest = performance.points[performance.points.length - 1];
  const portfolioReturn = latest.portfolioValue - 1;
  const benchmarkReturn = latest.benchmarkValue - 1;
  const excessReturn = latest.portfolioValue - latest.benchmarkValue;

  return (
    <a
      className="block rounded-lg border border-stone-200 bg-white p-5 shadow-sm hover:border-moss"
      href="#/performance"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">13F Portfolio vs {performance.benchmarkTicker}</h2>
          <p className="text-sm text-stone-500">
            {performance.startDate} {t("to")} {performance.endDate}
          </p>
        </div>
        <LineChart className="h-5 w-5 text-brass" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-stone-500">Berkshire 13F</p>
          <p className="font-semibold text-ink">{percent(portfolioReturn)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">{performance.benchmarkTicker}</p>
          <p className="font-semibold text-ink">{percent(benchmarkReturn)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">{t("excess")}</p>
          <p className="font-semibold text-ink">{percent(excessReturn)}</p>
        </div>
      </div>
    </a>
  );
}
