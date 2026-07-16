import { CheckCircle2, TriangleAlert } from "lucide-react";
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
  const coverage = quarters.length || history.length;
  const statusItems = [
    { label: `${t("reportPeriod")} ${latest.reportDate ?? t("notAvailable")}`, status: Boolean(latest.reportDate), tone: "ok" },
    { label: `${t("filingDate")} ${latest.filingDate ?? t("notAvailable")}`, status: Boolean(latest.filingDate), tone: "ok" },
    { label: `${t("lastGenerated")} ${dateTime(latest.generatedAt, language, t("notAvailable"))}`, status: Boolean(latest.generatedAt), tone: "ok" },
    { label: t("secDataOk"), status: Boolean(latest.holdings.length), tone: "ok" },
    { label: `${coverage} ${t("quartersAvailable")}`, status: coverage >= 2, tone: "ok" },
    { label: performanceValid ? t("performanceAvailable") : t("performanceUnavailable"), status: performanceValid, tone: performanceValid ? "ok" : "warn" },
  ];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
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
