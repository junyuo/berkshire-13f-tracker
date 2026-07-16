import { Activity, Gauge, LineChart, Star } from "lucide-react";
import { useLanguage } from "../i18n";
import type { Holding, PerformanceData } from "../types/holding";

function topWeight(holdings: Holding[], count: number): number {
  return holdings.slice(0, count).reduce((sum, holding) => sum + holding.portfolioWeight, 0);
}

export default function DashboardInsight({
  holdings,
  previousHoldings,
  changes,
  performance,
}: {
  holdings: Holding[];
  previousHoldings: Holding[];
  changes: Holding[];
  performance: PerformanceData | null;
}) {
  const { actionLabel, t } = useLanguage();
  const meaningfulMoves = changes.filter(
    (holding) =>
      holding.action === "New Position" ||
      holding.action === "Sold Out" ||
      Math.abs(holding.shareChangePercent ?? 0) >= 10 ||
      Math.abs(holding.weightChange ?? 0) >= 0.5,
  );
  const topMove = [...meaningfulMoves].sort((a, b) => Math.abs(b.weightChange ?? 0) - Math.abs(a.weightChange ?? 0))[0];
  const concentrationDelta = topWeight(holdings, 10) - topWeight(previousHoldings, 10);
  const concentrationLabel =
    Math.abs(concentrationDelta) < 0.05
      ? t("concentrationFlat")
      : concentrationDelta > 0
        ? t("moreConcentrated")
        : t("lessConcentrated");
  const concentrationClass = concentrationDelta > 0 ? "text-emerald-700" : concentrationDelta < 0 ? "text-red-700" : "text-stone-600";

  const items = [
    {
      icon: Star,
      label: t("mostImportantMove"),
      value: topMove ? `${topMove.ticker ?? topMove.issuerName} · ${actionLabel(topMove.action)}` : "-",
      detail: topMove ? `${(topMove.weightChange ?? 0).toFixed(2)} ${t("points")}` : t("basedOnWeightChange"),
    },
    {
      icon: Gauge,
      label: t("concentrationDirection"),
      value: concentrationLabel,
      detail: `${concentrationDelta > 0 ? "+" : ""}${concentrationDelta.toFixed(2)} ${t("points")}`,
      valueClass: concentrationClass,
    },
    {
      icon: Activity,
      label: t("meaningfulMoveCount"),
      value: meaningfulMoves.length.toLocaleString("en-US"),
      detail: t("meaningfulMovesSubtitle"),
    },
    {
      icon: LineChart,
      label: t("navPerformance"),
      value: performance?.points.length ? t("performanceAvailable") : t("performanceUnavailable"),
      detail: t("performanceEstimateBadge"),
      valueClass: performance?.points.length ? "text-emerald-700" : "text-amber-700",
    },
  ];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">{t("dashboardInsight")}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-md bg-stone-50 p-3 ring-1 ring-stone-200">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-stone-500">{item.label}</p>
                <Icon className="h-4 w-4 text-brass" />
              </div>
              <p className={`mt-2 font-semibold text-ink ${item.valueClass ?? ""}`}>{item.value}</p>
              <p className="mt-1 line-clamp-2 text-xs text-stone-500">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
