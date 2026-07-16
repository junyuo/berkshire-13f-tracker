import ChangesTable from "../components/ChangesTable";
import ConcentrationCards from "../components/ConcentrationCards";
import DataHealthCard from "../components/DataHealthCard";
import DashboardCards from "../components/DashboardCards";
import HistoryTrend from "../components/HistoryTrend";
import MeaningfulMoves from "../components/MeaningfulMoves";
import PerformanceSummaryCard from "../components/PerformanceSummaryCard";
import QuarterlySummary from "../components/QuarterlySummary";
import TopHoldingsChart from "../components/TopHoldingsChart";
import { useLanguage } from "../i18n";
import type { Holding, HistoryItem, LatestData, PerformanceData, QuarterData } from "../types/holding";

export default function Dashboard({
  latest,
  history,
  changes,
  quarters,
  performance,
}: {
  latest: LatestData;
  history: HistoryItem[];
  changes: Holding[];
  quarters: QuarterData[];
  performance: PerformanceData | null;
}) {
  const { actionLabel, t } = useLanguage();
  const visibleChanges = changes.filter((holding) => holding.action !== "Unchanged").slice(0, 8);
  const previousHoldings = quarters[1]?.holdings ?? [];

  return (
    <div className="space-y-6">
      <DashboardCards latest={latest} />
      <DataHealthCard latest={latest} history={history} quarters={quarters} performance={performance} />
      <ConcentrationCards holdings={latest.holdings} previousHoldings={previousHoldings} />
      <PerformanceSummaryCard performance={performance} />
      <QuarterlySummary changes={changes} />
      <MeaningfulMoves changes={changes} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <TopHoldingsChart holdings={latest.holdings} />
        <HistoryTrend history={history} />
      </div>
      <ChangesTable changes={visibleChanges} action="All" onActionChange={() => undefined} showFilter={false} />
      <section className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-600 shadow-sm">
        <h2 className="text-base font-semibold text-ink">{t("about13fData")}</h2>
        <dl className="mt-3 grid gap-3 md:grid-cols-5">
          <div>
            <dt className="font-medium text-ink">{actionLabel("New Position")}</dt>
            <dd>{t("aboutNewPosition")}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">{actionLabel("Added")}</dt>
            <dd>{t("aboutAdded")}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">{actionLabel("Reduced")}</dt>
            <dd>{t("aboutReduced")}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">{actionLabel("Sold Out")}</dt>
            <dd>{t("aboutSoldOut")}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">{actionLabel("Unchanged")}</dt>
            <dd>{t("aboutUnchanged")}</dd>
          </div>
        </dl>
        <ul className="mt-5 grid gap-2 border-t border-stone-200 pt-4 md:grid-cols-2">
          <li>{t("dataNoteDelay")}</li>
          <li>{t("dataNoteExclude")}</li>
          <li>{t("dataNoteValue")}</li>
          <li>{t("dataNoteShareSignal")}</li>
          <li>{t("dataNoteTicker")}</li>
        </ul>
      </section>
    </div>
  );
}
