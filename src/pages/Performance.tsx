import { useLanguage } from "../i18n";
import type { PerformanceData, PerformancePoint, QuarterlyReturn } from "../types/holding";

function percent(value: number): string {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function valueReturn(value: number): string {
  return percent(value - 1);
}

function periodLabel(quarter: QuarterlyReturn): string {
  return `${quarter.startDate.slice(0, 7)} - ${quarter.endDate.slice(0, 7)}`;
}

function averageIncludedWeight(quarters: QuarterlyReturn[]): number | null {
  const weights = quarters
    .map((quarter) => quarter.includedPortfolioWeight)
    .filter((weight): weight is number => weight != null);
  if (!weights.length) return null;
  return weights.reduce((total, weight) => total + weight, 0) / weights.length;
}

function longestStreak(quarters: QuarterlyReturn[], predicate: (quarter: QuarterlyReturn) => boolean): number {
  let current = 0;
  let longest = 0;
  quarters.forEach((quarter) => {
    current = predicate(quarter) ? current + 1 : 0;
    longest = Math.max(longest, current);
  });
  return longest;
}

function LineChart({ points }: { points: PerformancePoint[] }) {
  const { t } = useLanguage();
  const maxValue = Math.max(...points.flatMap((point) => [point.portfolioValue, point.benchmarkValue]), 1);
  const minValue = Math.min(...points.flatMap((point) => [point.portfolioValue, point.benchmarkValue]), 1);
  const span = Math.max(maxValue - minValue, 0.01);
  const firstPoint = points[0];
  const latestPoint = points[points.length - 1];
  const finalGap = latestPoint ? latestPoint.portfolioValue - latestPoint.benchmarkValue : 0;

  const coordinates = (key: "portfolioValue" | "benchmarkValue") =>
    points
      .map((point, index) => {
        const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
        const y = 100 - ((point[key] - minValue) / span) * 100;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("cumulativeReturn")}</h2>
          <p className="text-sm text-stone-500">{t("estimatedVsSpy")}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="inline-flex items-center gap-2 text-moss">
            <span className="h-2 w-5 rounded-full bg-moss" />
            Berkshire 13F
          </span>
          <span className="inline-flex items-center gap-2 text-brass">
            <span className="h-2 w-5 rounded-full bg-brass" />
            SPY
          </span>
        </div>
      </div>
      <svg className="mt-6 h-72 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
        <polyline points={coordinates("portfolioValue")} fill="none" stroke="#46624a" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <polyline points={coordinates("benchmarkValue")} fill="none" stroke="#a37633" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-3 grid gap-2 text-xs text-stone-500 sm:grid-cols-3">
        <span>{t("start")}: {firstPoint?.date}</span>
        <span className="sm:text-center">{t("end")}: {latestPoint?.date}</span>
        <span className={`font-semibold sm:text-right ${finalGap >= 0 ? "text-moss" : "text-red-700"}`}>
          {t("finalGap")}: {percent(finalGap)}
        </span>
      </div>
    </section>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

function ExcessReturnBars({ quarters }: { quarters: QuarterlyReturn[] }) {
  const { t } = useLanguage();
  const maxAbs = Math.max(...quarters.map((quarter) => Math.abs(quarter.excessReturn)), 0.01);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-ink">{t("quarterlyExcessReturn")}</h2>
        <p className="text-sm text-stone-500">{t("positiveBars")}</p>
      </div>
      <div className="mt-5 space-y-4">
        {quarters.map((quarter) => {
          const positive = quarter.excessReturn >= 0;
          const width = Math.max((Math.abs(quarter.excessReturn) / maxAbs) * 50, 2);
          return (
            <div key={`${quarter.startDate}-${quarter.endDate}`} className="grid gap-2 md:grid-cols-[170px_1fr_72px] md:items-center">
              <p className="text-sm font-medium text-stone-700">
                {quarter.startDate.slice(0, 7)} {t("to")} {quarter.endDate.slice(0, 7)}
              </p>
              <div className="relative h-5 rounded bg-stone-100">
                <div className="absolute left-1/2 top-0 h-full w-px bg-stone-300" />
                <div
                  className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full ${positive ? "left-1/2 bg-moss" : "right-1/2 bg-red-600"}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className={`text-sm font-medium md:text-right ${positive ? "text-moss" : "text-red-700"}`}>
                {percent(quarter.excessReturn)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OutperformanceTimeline({ quarters }: { quarters: QuarterlyReturn[] }) {
  const { t } = useLanguage();
  const wins = quarters.filter((quarter) => quarter.excessReturn > 0).length;
  const longestWin = longestStreak(quarters, (quarter) => quarter.excessReturn > 0);
  const longestLoss = longestStreak(quarters, (quarter) => quarter.excessReturn < 0);
  const maxAbs = Math.max(...quarters.map((quarter) => Math.abs(quarter.excessReturn)), 0.01);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("outperformanceTimeline")}</h2>
          <p className="text-sm text-stone-500">{t("winLossSubtitle")}</p>
        </div>
        <p className="text-sm font-semibold text-ink">
          {t("winRate")}: {wins} / {quarters.length}
        </p>
      </div>
      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(quarters.length, 1)}, minmax(0, 1fr))` }}>
        {quarters.map((quarter) => {
          const won = quarter.excessReturn > 0;
          const height = Math.max((Math.abs(quarter.excessReturn) / maxAbs) * 100, 16);
          return (
            <div
              key={`${quarter.startDate}-${quarter.endDate}-timeline`}
              className={`flex h-9 items-end rounded ${won ? "bg-emerald-50" : "bg-red-50"}`}
              title={`${quarter.startDate} ${t("to")} ${quarter.endDate}: ${percent(quarter.excessReturn)}`}
            >
              <span className={`block w-full rounded ${won ? "bg-moss" : "bg-red-600"}`} style={{ height: `${height}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid gap-1 text-xs text-stone-500 sm:grid-cols-3">
        <span>{quarters[0]?.startDate}</span>
        <span className="sm:text-center">
          {t("longestWinStreak")}: {longestWin} {t("periods")} · {t("longestLossStreak")}: {longestLoss} {t("periods")}
        </span>
        <span className="sm:text-right">{quarters[quarters.length - 1]?.endDate}</span>
      </div>
    </section>
  );
}

function bestExcessQuarter(quarters: QuarterlyReturn[]): QuarterlyReturn | undefined {
  return [...quarters].sort((a, b) => b.excessReturn - a.excessReturn)[0];
}

function worstExcessQuarter(quarters: QuarterlyReturn[]): QuarterlyReturn | undefined {
  return [...quarters].sort((a, b) => a.excessReturn - b.excessReturn)[0];
}

function closestExcessQuarter(quarters: QuarterlyReturn[]): QuarterlyReturn | undefined {
  return [...quarters].sort((a, b) => Math.abs(a.excessReturn) - Math.abs(b.excessReturn))[0];
}

function DriverCard({ title, quarter }: { title: string; quarter: QuarterlyReturn | undefined }) {
  const { t } = useLanguage();
  const positive = (quarter?.excessReturn ?? 0) >= 0;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs text-stone-500">{quarter ? periodLabel(quarter) : "-"}</p>
      {quarter ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-stone-500">13F</p>
            <p className="mt-1 font-semibold text-ink">{percent(quarter.portfolioReturn)}</p>
          </div>
          <div>
            <p className="text-stone-500">SPY</p>
            <p className="mt-1 font-semibold text-ink">{percent(quarter.benchmarkReturn)}</p>
          </div>
          <div className="text-right">
            <p className="text-stone-500">{t("excess")}</p>
            <p className={`mt-1 font-semibold ${positive ? "text-moss" : "text-red-700"}`}>{percent(quarter.excessReturn)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Performance({ performance }: { performance: PerformanceData | null }) {
  const { methodologyLabel, t } = useLanguage();
  if (!performance?.points.length) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-amber-800 shadow-sm">
        <h2 className="text-xl font-semibold">{t("performanceUnavailable")}</h2>
        <p className="mt-2 text-sm">{t("performanceUnavailableText")}</p>
        <p className="mt-2 text-sm font-medium">{t("holdingsDataStillAvailable")}</p>
        {performance?.methodology.length ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
            {performance.methodology.map((note) => (
              <li key={note}>{methodologyLabel(note)}</li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  const latestPoint = performance.points[performance.points.length - 1];
  const outperformed = performance.quarterlyReturns.filter((quarter) => quarter.excessReturn > 0).length;
  const underperformed = performance.quarterlyReturns.filter((quarter) => quarter.excessReturn < 0).length;
  const averageCoverage = averageIncludedWeight(performance.quarterlyReturns);
  const winRate = performance.quarterlyReturns.length ? outperformed / performance.quarterlyReturns.length : 0;
  const bestExcess = bestExcessQuarter(performance.quarterlyReturns);
  const worstExcess = worstExcessQuarter(performance.quarterlyReturns);
  const closestExcess = closestExcessQuarter(performance.quarterlyReturns);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink">{t("navPerformance")}</h2>
        <p className="mt-1 text-sm text-stone-500">
          {t("performanceSubtitle")} {performance.benchmarkTicker}.
        </p>
        <div className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
          {t("performanceEstimateBadge")}
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("performanceSnapshot")}</h2>
            <p className="text-sm text-stone-500">
              {performance.startDate} {t("to")} {performance.endDate}
            </p>
          </div>
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ring-1 ${
            averageCoverage != null && averageCoverage < 90
              ? "bg-amber-50 text-amber-800 ring-amber-200"
              : "bg-emerald-50 text-emerald-800 ring-emerald-200"
          }`}>
            {t("averageCoverage")}: {averageCoverage == null ? "-" : `${averageCoverage.toFixed(2)}%`}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatCard label={t("berkshire13fReturn")} value={valueReturn(latestPoint.portfolioValue)} />
          <StatCard label={`${performance.benchmarkTicker} Return`} value={valueReturn(latestPoint.benchmarkValue)} />
          <StatCard label={t("excessReturn")} value={percent(latestPoint.portfolioValue - latestPoint.benchmarkValue)} />
          <StatCard label={t("winRate")} value={percent(winRate)} hint={`${outperformed} / ${performance.quarterlyReturns.length} ${t("periods")}`} />
          <StatCard label={t("periodsCovered")} value={`${performance.quarterlyReturns.length} ${t("periods")}`} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-700">{t("outperformedSpy")}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{outperformed} {t("periods")}</p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">{t("underperformedSpy")}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{underperformed} {t("periods")}</p>
        </div>
      </section>

      <LineChart points={performance.points} />
      <OutperformanceTimeline quarters={performance.quarterlyReturns} />
      <ExcessReturnBars quarters={performance.quarterlyReturns} />

      <section>
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("returnDrivers")}</h2>
          <p className="text-sm text-stone-500">{t("returnDriversSubtitle")}</p>
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <DriverCard title={t("biggestOutperformance")} quarter={bestExcess} />
          <DriverCard title={t("biggestUnderperformance")} quarter={worstExcess} />
          <DriverCard title={t("closestToSpy")} quarter={closestExcess} />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 p-5">
          <h2 className="text-lg font-semibold text-ink">{t("quarterlyReturns")}</h2>
          <p className="text-sm text-stone-500">{t("quarterlyReturnsSubtitle")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="sticky top-0 z-10 bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-stone-600">{t("period")}</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">Berkshire 13F</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">{performance.benchmarkTicker}</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">{t("excess")}</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">{t("includedWeight")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {performance.quarterlyReturns.map((quarter) => (
                <tr key={`${quarter.startDate}-${quarter.endDate}`}>
                  <td className="px-4 py-3 text-stone-700">
                    {quarter.startDate} {t("to")} {quarter.endDate}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">{percent(quarter.portfolioReturn)}</td>
                  <td className="px-4 py-3 text-right text-stone-700">{percent(quarter.benchmarkReturn)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${quarter.excessReturn >= 0 ? "text-moss" : "text-red-700"}`}>
                    {percent(quarter.excessReturn)}
                  </td>
                  <td className={`px-4 py-3 text-right ${quarter.includedPortfolioWeight != null && quarter.includedPortfolioWeight < 90 ? "font-medium text-amber-700" : "text-stone-700"}`}>
                    {quarter.includedPortfolioWeight == null ? "-" : `${quarter.includedPortfolioWeight.toFixed(2)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {performance.missingSymbols.length ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {t("missingPriceDataFor")} {performance.missingSymbols.join(", ")}. {t("missingPriceDataNote")}
        </section>
      ) : null}

      <details className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-600 shadow-sm">
        <summary className="cursor-pointer text-base font-semibold text-ink">{t("methodologySummary")}</summary>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {performance.methodology.map((note) => (
            <li key={note}>{methodologyLabel(note)}</li>
          ))}
          <li>{t("methodWeights")}</li>
          <li>{t("methodIncludedWeight")}</li>
          <li>{t("methodReturns")}</li>
        </ul>
      </details>
    </div>
  );
}
