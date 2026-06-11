import { Activity, CheckCircle2, Clock, Database, TriangleAlert } from "lucide-react";
import type { HistoryItem, LatestData, PerformanceData, QuarterData } from "../types/holding";

function dateTime(value: string | null): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
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
  const performanceValid = Boolean(performance?.points.length);
  const StatusIcon = performanceValid ? CheckCircle2 : TriangleAlert;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ink">Data Health</h2>
          <p className="text-sm text-stone-500">Latest update status and data completeness.</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
          performanceValid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}>
          <StatusIcon className="h-4 w-4" />
          {performanceValid ? "Performance available" : "Performance unavailable"}
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-md border border-stone-200 p-3">
          <Clock className="h-4 w-4 text-brass" />
          <p className="mt-2 text-xs text-stone-500">Last generated</p>
          <p className="font-medium text-ink">{dateTime(latest.generatedAt)}</p>
        </div>
        <div className="rounded-md border border-stone-200 p-3">
          <Database className="h-4 w-4 text-brass" />
          <p className="mt-2 text-xs text-stone-500">Latest report</p>
          <p className="font-medium text-ink">{latest.reportDate ?? "Not available"}</p>
        </div>
        <div className="rounded-md border border-stone-200 p-3">
          <Activity className="h-4 w-4 text-brass" />
          <p className="mt-2 text-xs text-stone-500">Holdings</p>
          <p className="font-medium text-ink">{latest.holdingsCount.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-md border border-stone-200 p-3">
          <Database className="h-4 w-4 text-brass" />
          <p className="mt-2 text-xs text-stone-500">History coverage</p>
          <p className="font-medium text-ink">{quarters.length || history.length} quarters</p>
        </div>
      </div>
      {!performanceValid ? (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Performance data is optional and may be unavailable when public price sources cannot be reached. Holdings,
          changes, and quarter history remain available.
        </p>
      ) : null}
    </section>
  );
}
