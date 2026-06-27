import type { PerformanceData, PerformancePoint, QuarterlyReturn } from "../types/holding";

function percent(value: number): string {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function valueReturn(value: number): string {
  return percent(value - 1);
}

function LineChart({ points }: { points: PerformancePoint[] }) {
  const maxValue = Math.max(...points.flatMap((point) => [point.portfolioValue, point.benchmarkValue]), 1);
  const minValue = Math.min(...points.flatMap((point) => [point.portfolioValue, point.benchmarkValue]), 1);
  const span = Math.max(maxValue - minValue, 0.01);

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
          <h2 className="text-lg font-semibold text-ink">Cumulative Return</h2>
          <p className="text-sm text-stone-500">Estimated 13F portfolio vs SPY.</p>
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
      <div className="mt-3 flex justify-between text-xs text-stone-500">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function ExcessReturnBars({ quarters }: { quarters: QuarterlyReturn[] }) {
  const maxAbs = Math.max(...quarters.map((quarter) => Math.abs(quarter.excessReturn)), 0.01);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-ink">Quarterly Excess Return</h2>
        <p className="text-sm text-stone-500">Positive bars mean the estimated 13F portfolio outperformed SPY.</p>
      </div>
      <div className="mt-5 space-y-4">
        {quarters.map((quarter) => {
          const positive = quarter.excessReturn >= 0;
          const width = Math.max((Math.abs(quarter.excessReturn) / maxAbs) * 50, 2);
          return (
            <div key={`${quarter.startDate}-${quarter.endDate}`} className="grid gap-2 md:grid-cols-[170px_1fr_72px] md:items-center">
              <p className="text-sm font-medium text-stone-700">
                {quarter.startDate.slice(0, 7)} to {quarter.endDate.slice(0, 7)}
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

function bestQuarter(quarters: QuarterlyReturn[]): QuarterlyReturn | undefined {
  return [...quarters].sort((a, b) => b.portfolioReturn - a.portfolioReturn)[0];
}

function worstQuarter(quarters: QuarterlyReturn[]): QuarterlyReturn | undefined {
  return [...quarters].sort((a, b) => a.portfolioReturn - b.portfolioReturn)[0];
}

export default function Performance({ performance }: { performance: PerformanceData | null }) {
  if (!performance?.points.length) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-amber-800 shadow-sm">
        <h2 className="text-xl font-semibold">Performance unavailable</h2>
        <p className="mt-2 text-sm">
          Performance data has not been generated yet, usually because the no-key public price source was unavailable
          during the data update workflow. Holdings, changes, and quarter history remain available.
        </p>
        {performance?.methodology.length ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
            {performance.methodology.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  const latestPoint = performance.points[performance.points.length - 1];
  const best = bestQuarter(performance.quarterlyReturns);
  const worst = worstQuarter(performance.quarterlyReturns);
  const outperformed = performance.quarterlyReturns.filter((quarter) => quarter.excessReturn > 0).length;
  const underperformed = performance.quarterlyReturns.filter((quarter) => quarter.excessReturn < 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Performance</h2>
        <p className="mt-1 text-sm text-stone-500">
          Estimated quarterly-rebalanced Berkshire 13F portfolio compared with {performance.benchmarkTicker}.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Berkshire 13F Return" value={valueReturn(latestPoint.portfolioValue)} />
        <StatCard label={`${performance.benchmarkTicker} Return`} value={valueReturn(latestPoint.benchmarkValue)} />
        <StatCard label="Excess Return" value={percent(latestPoint.portfolioValue - latestPoint.benchmarkValue)} />
        <StatCard label="Best Quarter" value={best ? percent(best.portfolioReturn) : "-"} />
        <StatCard label="Worst Quarter" value={worst ? percent(worst.portfolioReturn) : "-"} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-700">Outperformed SPY</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{outperformed} periods</p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">Underperformed SPY</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{underperformed} periods</p>
        </div>
      </section>

      <LineChart points={performance.points} />
      <ExcessReturnBars quarters={performance.quarterlyReturns} />

      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 p-5">
          <h2 className="text-lg font-semibold text-ink">Quarterly Returns</h2>
          <p className="text-sm text-stone-500">Each interval uses the starting quarter's disclosed 13F weights.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Period</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">Berkshire 13F</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">{performance.benchmarkTicker}</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">Excess</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">Included Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {performance.quarterlyReturns.map((quarter) => (
                <tr key={`${quarter.startDate}-${quarter.endDate}`}>
                  <td className="px-4 py-3 text-stone-700">
                    {quarter.startDate} to {quarter.endDate}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">{percent(quarter.portfolioReturn)}</td>
                  <td className="px-4 py-3 text-right text-stone-700">{percent(quarter.benchmarkReturn)}</td>
                  <td className="px-4 py-3 text-right text-stone-700">{percent(quarter.excessReturn)}</td>
                  <td className="px-4 py-3 text-right text-stone-700">
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
          Missing price data for: {performance.missingSymbols.join(", ")}. These symbols are excluded from affected
          portfolio intervals and remaining weights are normalized.
        </section>
      ) : null}

      <section className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-600 shadow-sm">
        <h2 className="text-base font-semibold text-ink">Methodology</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {performance.methodology.map((note) => (
            <li key={note}>{note}</li>
          ))}
          <li>Weights are based on 13F report dates and rebalanced each quarter.</li>
          <li>Included weight shows the portion of the disclosed portfolio with usable price data for each interval.</li>
          <li>Returns do not include cash, non-13F assets, or undisclosed intraperiod trades.</li>
        </ul>
      </section>
    </div>
  );
}
