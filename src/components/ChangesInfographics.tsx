import { useMemo } from "react";
import { useLanguage } from "../i18n";
import type { Action, Holding } from "../types/holding";
import type { ChangeFilter } from "./ChangesTable";

const actions: Action[] = ["New Position", "Added", "Reduced", "Sold Out", "Unchanged"];

const tones = {
  blue: {
    bar: "bg-blue-600",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    text: "text-blue-700",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
  },
  green: {
    bar: "bg-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    text: "text-emerald-700",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  red: {
    bar: "bg-red-600",
    badge: "bg-red-50 text-red-700 ring-red-200",
    text: "text-red-700",
    chip: "border-red-200 bg-red-50 text-red-700",
  },
  amber: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    text: "text-amber-700",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
  },
  stone: {
    bar: "bg-stone-400",
    badge: "bg-stone-50 text-stone-600 ring-stone-200",
    text: "text-stone-700",
    chip: "border-stone-200 bg-stone-50 text-stone-700",
  },
};

function toneForAction(action: ChangeFilter) {
  if (action === "New Position" || action === "Sold Out") return tones.blue;
  if (action === "Added") return tones.green;
  if (action === "Reduced") return tones.red;
  return tones.stone;
}

function displayName(holding: Holding): string {
  return holding.ticker ?? holding.issuerName ?? holding.cusip ?? "-";
}

function formatPoints(value: number | undefined, pointsLabel: string): string {
  const safeValue = value ?? 0;
  return `${safeValue > 0 ? "+" : ""}${safeValue.toFixed(2)} ${pointsLabel}`;
}

function formatPercent(value: number | null | undefined, unavailableLabel: string): string {
  if (value == null) return unavailableLabel;
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function LeaderList({
  title,
  items,
  tone,
  metric,
}: {
  title: string;
  items: Holding[];
  tone: typeof tones.blue;
  metric: (holding: Holding) => string;
}) {
  const { actionLabel, t } = useLanguage();

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-stone-50">
      <div className={`h-1 ${tone.bar}`} />
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tone.badge}`}>{items.length}</span>
        </div>
        <div className="mt-3 space-y-2">
          {items.map((holding) => (
            <div key={`${title}-${holding.cusip}-${holding.action}`} className="rounded bg-white p-2 ring-1 ring-stone-200">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{displayName(holding)}</p>
                  <p className="text-xs text-stone-500">{actionLabel(holding.action)}</p>
                </div>
                <p className={`text-right text-xs font-semibold ${tone.text}`}>{metric(holding)}</p>
              </div>
            </div>
          ))}
          {!items.length ? <p className="py-3 text-sm text-stone-500">{t("noSignal")}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function ChangesInfographics({
  changes,
  action,
  onActionChange,
}: {
  changes: Holding[];
  action: ChangeFilter;
  onActionChange: (action: ChangeFilter) => void;
}) {
  const { actionLabel, t } = useLanguage();
  const stats = useMemo(() => {
    const counts = actions.reduce<Record<Action, number>>(
      (result, item) => ({ ...result, [item]: changes.filter((holding) => holding.action === item).length }),
      {
        "New Position": 0,
        Added: 0,
        Reduced: 0,
        "Sold Out": 0,
        Unchanged: 0,
      },
    );
    const changedCount = changes.length - counts.Unchanged;
    const changedPercent = changes.length ? (changedCount / changes.length) * 100 : 0;
    const unchangedPercent = changes.length ? (counts.Unchanged / changes.length) * 100 : 0;

    return { changedCount, changedPercent, counts, unchangedPercent };
  }, [changes]);

  const weightIncreases = useMemo(
    () =>
      changes
        .filter((holding) => (holding.weightChange ?? 0) > 0)
        .sort((a, b) => (b.weightChange ?? 0) - (a.weightChange ?? 0))
        .slice(0, 3),
    [changes],
  );
  const weightDecreases = useMemo(
    () =>
      changes
        .filter((holding) => (holding.weightChange ?? 0) < 0)
        .sort((a, b) => Math.abs(b.weightChange ?? 0) - Math.abs(a.weightChange ?? 0))
        .slice(0, 3),
    [changes],
  );
  const shareAdds = useMemo(
    () =>
      changes
        .filter((holding) => holding.shareChangePercent != null && holding.shareChangePercent > 0)
        .sort((a, b) => (b.shareChangePercent ?? 0) - (a.shareChangePercent ?? 0))
        .slice(0, 3),
    [changes],
  );
  const shareTrims = useMemo(
    () =>
      changes
        .filter((holding) => holding.shareChangePercent != null && holding.shareChangePercent < 0)
        .sort((a, b) => (a.shareChangePercent ?? 0) - (b.shareChangePercent ?? 0))
        .slice(0, 3),
    [changes],
  );

  const filters: ChangeFilter[] = ["Changed", "All", ...actions];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("changesOverview")}</h2>
          <p className="text-sm text-stone-500">{t("changesOverviewSubtitle")}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t("changedVsUnchanged")}</p>
          <p className="text-2xl font-semibold text-ink">
            {stats.changedCount.toLocaleString("en-US")} / {changes.length.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-stone-100" aria-label={t("changedVsUnchanged")}>
          <div className="bg-emerald-600" style={{ width: `${stats.changedPercent}%` }} />
          <div className="bg-stone-300" style={{ width: `${stats.unchangedPercent}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
          <span>
            {t("changed")}: {stats.changedPercent.toFixed(1)}%
          </span>
          <span>
            {t("unchanged")}: {stats.unchangedPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t("actionBreakdown")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {filters.map((item) => {
            const isActive = action === item;
            const count =
              item === "All" ? changes.length : item === "Changed" ? stats.changedCount : stats.counts[item as Action];
            const label = item === "All" ? t("allActions") : item === "Changed" ? t("changedOnly") : actionLabel(item);
            const tone = toneForAction(item);

            return (
              <button
                key={item}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-stone-100 ${
                  isActive ? tone.chip : "border-stone-200 bg-white text-stone-600"
                }`}
                onClick={() => onActionChange(item)}
                type="button"
              >
                {label} <span className="tabular-nums">{count.toLocaleString("en-US")}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div>
          <div>
            <h3 className="text-sm font-semibold text-ink">{t("weightImpactLeaders")}</h3>
            <p className="text-xs text-stone-500">{t("weightImpactSubtitle")}</p>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <LeaderList
              title={t("weightIncreaseLeaders")}
              items={weightIncreases}
              tone={tones.green}
              metric={(holding) => formatPoints(holding.weightChange, t("points"))}
            />
            <LeaderList
              title={t("weightDecreaseLeaders")}
              items={weightDecreases}
              tone={tones.red}
              metric={(holding) => formatPoints(holding.weightChange, t("points"))}
            />
          </div>
        </div>
        <div>
          <div>
            <h3 className="text-sm font-semibold text-ink">{t("shareChangeSignal")}</h3>
            <p className="text-xs text-stone-500">{t("shareChangeSignalSubtitle")}</p>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <LeaderList
              title={t("largestShareAdds")}
              items={shareAdds}
              tone={tones.green}
              metric={(holding) => formatPercent(holding.shareChangePercent, t("notAvailable"))}
            />
            <LeaderList
              title={t("largestShareTrims")}
              items={shareTrims}
              tone={tones.red}
              metric={(holding) => formatPercent(holding.shareChangePercent, t("notAvailable"))}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
