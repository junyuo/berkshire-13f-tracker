import { Activity, CheckCircle2, Clock, Database, TriangleAlert } from "lucide-react";
import { useLanguage } from "../i18n";
import type { HistoryItem, LatestData, PerformanceData, QuarterData } from "../types/holding";

function dateTime(value: string | null, locale: string, fallback: string): string {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function DataHealthCard({
  latest,
  history,
  quarters,
  performance,
}: {
  latest: LatestData;
  history: HistoryItem[];
  quarters: QuarterData[];
  performance: PerformanceData | null;
}) {
  const { language, t } = useLanguage();
  const performanceValid = Boolean(performance?.points.length);
  const StatusIcon = performanceValid ? CheckCircle2 : TriangleAlert;
  const coverage = quarters.length || history.length;
  const statusItems = [
    { label: t("secDataOk"), status: Boolean(latest.holdings.length), tone: "ok" },
    { label: `${coverage} ${t("quartersAvailable")}`, status: coverage >= 2, tone: "ok" },
    { label: performanceValid ? t("performanceAvailable") : t("performanceUnavailable"), status: performanceValid, tone: performanceValid ? "ok" : "warn" },
    { label: `${t("lastGenerated")} ${dateTime(latest.generatedAt, language, t("notAvailable"))}`, status: Boolean(latest.generatedAt), tone: "ok" },
  ];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("dataHealth")}</h2>
          <p className="text-sm text-stone-500">{t("dataHealthSubtitle")}</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
          performanceValid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}>
          <StatusIcon className="h-4 w-4" />
          {performanceValid ? t("performanceAvailable") : t("performanceUnavailable")}
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-md border border-stone-200 p-3">
          <Clock className="h-4 w-4 text-brass" />
          <p className="mt-2 text-xs text-stone-500">{t("lastGenerated")}</p>
          <p className="font-medium text-ink">{dateTime(latest.generatedAt, language, t("notAvailable"))}</p>
        </div>
        <div className="rounded-md border border-stone-200 p-3">
          <Database className="h-4 w-4 text-brass" />
          <p className="mt-2 text-xs text-stone-500">{t("latestReport")}</p>
          <p className="font-medium text-ink">{latest.reportDate ?? t("notAvailable")}</p>
        </div>
        <div className="rounded-md border border-stone-200 p-3">
          <Activity className="h-4 w-4 text-brass" />
          <p className="mt-2 text-xs text-stone-500">{t("holdings")}</p>
          <p className="font-medium text-ink">{latest.holdingsCount.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-md border border-stone-200 p-3">
          <Database className="h-4 w-4 text-brass" />
          <p className="mt-2 text-xs text-stone-500">{t("historyCoverage")}</p>
          <p className="font-medium text-ink">{coverage} {t("quarters")}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-200 pt-4">
        {statusItems.map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
              item.status && item.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {item.status && item.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
            {item.label}
          </span>
        ))}
      </div>
      {!performanceValid ? (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {t("performanceOptional")}
        </p>
      ) : null}
    </section>
  );
}
