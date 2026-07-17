import { X } from "lucide-react";
import { useLanguage, type TranslationKey } from "../i18n";
import type { Holding, QuarterData } from "../types/holding";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function fullMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function findHolding(quarter: QuarterData, cusip: string | null): Holding | undefined {
  return quarter.holdings.find((holding) => holding.cusip === cusip);
}

function timelineState(current: Holding | undefined, previous: Holding | undefined): { labelKey?: TranslationKey; action?: "Added" | "Reduced"; className: string } {
  if (!current) return { labelKey: "notHeld", className: "border-stone-300 bg-white text-stone-400" };
  if (!previous) return { labelKey: "new", className: "border-blue-600 bg-blue-600 text-white" };
  if (current.shares > previous.shares) return { action: "Added", className: "border-emerald-600 bg-emerald-600 text-white" };
  if (current.shares < previous.shares) return { action: "Reduced", className: "border-red-600 bg-red-600 text-white" };
  return { labelKey: "held", className: "border-moss bg-moss text-white" };
}

function stateLabel(
  state: { labelKey?: TranslationKey; action?: "Added" | "Reduced" },
  t: (key: TranslationKey) => string,
  actionLabel: (action: "Added" | "Reduced") => string,
): string {
  return state.action ? actionLabel(state.action) : t(state.labelKey ?? "notHeld");
}

function storyKey(holding: Holding): TranslationKey {
  if (holding.action === "Sold Out" || holding.trend === "Exited") return "holdingStoryExited";
  if (holding.action === "New Position" || holding.trend === "New" || holding.trend === "Re-entered") return "holdingStoryNew";
  if (holding.trend === "Accumulating" || holding.action === "Added") return "holdingStoryAccumulating";
  if (holding.trend === "Trimming" || holding.action === "Reduced") return "holdingStoryTrimming";
  if ((holding.consecutiveQuartersHeld ?? 0) >= 6 || (holding.quartersHeld ?? 0) >= 6) return "holdingStoryCore";
  return "holdingStoryMixed";
}

export default function HoldingDetailPanel({
  holding,
  quarters,
  onClose,
}: {
  holding: Holding | null;
  quarters: QuarterData[];
  onClose: () => void;
}) {
  const { actionLabel, t, trendLabel } = useLanguage();
  if (!holding) return null;

  const history = quarters
    .map((quarter) => ({
      quarter,
      holding: findHolding(quarter, holding.cusip),
    }))
    .reverse();
  const maxWeight = Math.max(...history.map((item) => item.holding?.portfolioWeight ?? 0), 1);

  return (
    <div className="fixed inset-0 z-50 bg-ink/25 px-4 py-6 backdrop-blur-sm sm:px-6" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
          <div>
            <p className="text-sm font-medium text-brass">{holding.ticker ?? holding.cusip}</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">{holding.issuerName}</h2>
            <p className="mt-1 font-mono text-xs text-stone-500">CUSIP {holding.cusip}</p>
          </div>
          <button
            className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-ink"
            onClick={onClose}
            aria-label={t("closeHoldingDetails")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">{t("marketValue")}</p>
              <p className="mt-1 font-semibold text-ink">{money(holding.value)}</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">{t("shares")}</p>
              <p className="mt-1 font-semibold text-ink">{holding.shares.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">{t("weight")}</p>
              <p className="mt-1 font-semibold text-ink">{holding.portfolioWeight.toFixed(2)}%</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">{t("latestAction")}</p>
              <p className="mt-1 font-semibold text-ink">{actionLabel(holding.action)}</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">{t("recentTrend")}</p>
              <p className="mt-1 font-semibold text-ink">{trendLabel(holding.trend)}</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">{t("heldIn8Quarters")}</p>
              <p className="mt-1 font-semibold text-ink">{holding.quartersHeld ?? 0} {t("quarters")}</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">{t("consecutiveHeld")}</p>
              <p className="mt-1 font-semibold text-ink">{holding.consecutiveQuartersHeld ?? 0} {t("quarters")}</p>
            </div>
            <div className="rounded-md border border-stone-200 p-3">
              <p className="text-xs text-stone-500">{t("shareChange")}</p>
              <p className="mt-1 font-semibold text-ink">
                {holding.shareChangePercent == null ? "-" : `${holding.shareChangePercent.toFixed(2)}%`}
              </p>
            </div>
          </div>

          <section className="mt-6 rounded-md bg-stone-50 p-4 ring-1 ring-stone-200">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t("holdingStory")}</p>
            <p className="mt-2 text-lg font-semibold text-ink">{t(storyKey(holding))}</p>
            <p className="mt-1 text-sm text-stone-600">
              {t("recentTrend")}: {trendLabel(holding.trend)} · {t("latestAction")}: {actionLabel(holding.action)}
            </p>
          </section>

          <section className="mt-6">
            <div>
              <h3 className="text-base font-semibold text-ink">{t("eightQuarterHoldingTimeline")}</h3>
              <p className="text-sm text-stone-500">{t("timelineSubtitle")}</p>
            </div>
            <div className="mt-4 overflow-x-auto pb-2">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-8 items-start gap-2">
                  {history.map(({ quarter, holding: quarterHolding }, index) => {
                    const previousHolding = index > 0 ? history[index - 1].holding : undefined;
                    const state = timelineState(quarterHolding, previousHolding);
                    const reportDate = quarter.reportDate ?? "Unknown";
                    return (
                      <div key={reportDate} className="relative text-center">
                        {index > 0 ? <span className="absolute left-[-50%] top-4 h-px w-full bg-stone-200" /> : null}
                        <div
                          className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-semibold ${state.className}`}
                          title={`${reportDate}: ${stateLabel(state, t, actionLabel)}`}
                        >
                          {quarterHolding ? "✓" : ""}
                        </div>
                        <p className="mt-2 text-xs font-medium text-stone-700">{reportDate.slice(0, 7)}</p>
                        <p className="mt-1 text-xs text-stone-500">{stateLabel(state, t, actionLabel)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 grid grid-cols-8 gap-2">
                  {history.map(({ quarter, holding: quarterHolding }) => (
                    <div key={`${quarter.reportDate}-detail`} className="rounded-md bg-stone-50 p-2 text-center">
                      <p className="text-xs font-medium text-ink">{quarterHolding ? `${quarterHolding.portfolioWeight.toFixed(2)}%` : "-"}</p>
                      <p className="mt-1 text-[11px] text-stone-500">{quarterHolding ? money(quarterHolding.value) : t("notHeld")}</p>
                      <p className="mt-1 text-[11px] text-stone-400">
                        {quarterHolding ? `${quarterHolding.shares.toLocaleString("en-US")} ${t("shares")}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-md bg-stone-50 p-3">
                  <p className="text-xs font-medium text-stone-500">{t("weightSparkline")}</p>
                  <div className="mt-3 grid h-16 grid-cols-8 items-end gap-2">
                    {history.map(({ quarter, holding: quarterHolding }) => (
                      <div key={`${quarter.reportDate}-weight`} className="flex h-full items-end justify-center rounded bg-white ring-1 ring-stone-200">
                        <div
                          className="w-full rounded-t bg-moss"
                          style={{ height: `${quarterHolding ? Math.max((quarterHolding.portfolioWeight / maxWeight) * 100, 4) : 0}%` }}
                          title={`${quarter.reportDate ?? ""}: ${quarterHolding ? `${quarterHolding.portfolioWeight.toFixed(2)}%` : t("notHeld")}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-600">
                  {[
                    { label: t("held"), className: "bg-moss" },
                    { label: actionLabel("Added"), className: "bg-emerald-600" },
                    { label: actionLabel("Reduced"), className: "bg-red-600" },
                    { label: t("new"), className: "bg-blue-600" },
                    { label: t("notHeld"), className: "border border-stone-300 bg-white" },
                  ].map((item) => (
                    <span key={item.label} className="inline-flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-base font-semibold text-ink">{t("recentQuarterDetail")}</h3>
            <div className="mt-4 space-y-3">
              {history.map(({ quarter, holding: quarterHolding }, index) => {
                const previousHolding = index > 0 ? history[index - 1].holding : undefined;
                const state = timelineState(quarterHolding, previousHolding);
                return (
                <div key={quarter.reportDate} className="grid gap-2 md:grid-cols-[96px_120px_1fr_150px] md:items-center">
                  <p className="text-sm font-medium text-stone-700">{quarter.reportDate}</p>
                  <p className="text-xs font-medium text-stone-500">{stateLabel(state, t, actionLabel)}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full ${quarterHolding ? "bg-moss" : "bg-transparent"}`}
                      style={{ width: `${quarterHolding ? Math.max(quarterHolding.portfolioWeight, 1) : 0}%` }}
                    />
                  </div>
                  <div className="text-sm text-stone-600 md:text-right">
                    <p>{quarterHolding ? money(quarterHolding.value) : t("notHeld")}</p>
                    <p className="text-xs text-stone-400">
                      {quarterHolding ? `${quarterHolding.shares.toLocaleString("en-US")} ${t("shares")}` : ""}
                    </p>
                  </div>
                </div>
                );
              })}
            </div>
          </section>

          <section className="mt-6 rounded-md bg-stone-50 p-4 text-sm text-stone-600">
            <p>
              {t("currentReportedValue")} <span className="font-medium text-ink">{fullMoney(holding.value)}</span>. {t("detailDisclosure")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
