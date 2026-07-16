import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpAZ, ArrowUpWideNarrow, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { useLanguage, type TranslationKey } from "../i18n";
import type { Action, Holding } from "../types/holding";

const actions: Action[] = ["New Position", "Added", "Reduced", "Sold Out", "Unchanged"];
export type ChangeFilter = Action | "All" | "Changed";
type ChangeSortKey =
  | "weightChange"
  | "shareChangePercent"
  | "valueChange"
  | "shareChange"
  | "value"
  | "portfolioWeight"
  | "issuerName";

const sortLabelKeys: Record<ChangeSortKey, TranslationKey> = {
  weightChange: "weightChange",
  shareChangePercent: "shareChangePercent",
  valueChange: "valueChange",
  shareChange: "shareChange",
  value: "currentValue",
  portfolioWeight: "portfolioWeight",
  issuerName: "issuerName",
};

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function badgeClass(action: Action): string {
  if (action === "New Position") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (action === "Added") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (action === "Reduced") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (action === "Sold Out") return "bg-red-50 text-red-700 ring-red-200";
  return "bg-stone-50 text-stone-600 ring-stone-200";
}

export default function ChangesTable({
  changes,
  action,
  onActionChange,
  showFilter = true,
  onSelectHolding,
}: {
  changes: Holding[];
  action: ChangeFilter;
  onActionChange: (action: ChangeFilter) => void;
  showFilter?: boolean;
  onSelectHolding?: (holding: Holding) => void;
}) {
  const { actionLabel, t } = useLanguage();
  const [sortKey, setSortKey] = useState<ChangeSortKey>("weightChange");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const visible =
      action === "All"
        ? changes
        : action === "Changed"
          ? changes.filter((holding) => holding.action !== "Unchanged")
          : changes.filter((holding) => holding.action === action);

    return [...visible].sort((a, b) => {
      const aValue = a[sortKey] ?? (sortKey === "shareChangePercent" ? Number.NEGATIVE_INFINITY : "");
      const bValue = b[sortKey] ?? (sortKey === "shareChangePercent" ? Number.NEGATIVE_INFINITY : "");
      const result = typeof aValue === "string" ? aValue.localeCompare(String(bValue)) : Number(aValue) - Number(bValue);
      return direction === "asc" ? result : -result;
    });
  }, [action, changes, direction, sortKey]);

  const DirectionIcon =
    sortKey === "issuerName"
      ? direction === "asc"
        ? ArrowDownAZ
        : ArrowUpAZ
      : direction === "asc"
        ? ArrowUpWideNarrow
        : ArrowDownWideNarrow;

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("quarterlyChanges")}</h2>
          <p className="text-sm text-stone-500">{t("comparedPriorFiling")}</p>
        </div>
        {showFilter ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
              value={action}
              onChange={(event) => onActionChange(event.target.value as ChangeFilter)}
            >
              <option value="Changed">{t("changedOnly")}</option>
              <option value="All">{t("allActions")}</option>
              {actions.map((item) => (
                <option key={item} value={item}>
                  {actionLabel(item)}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
              value={sortKey}
              onChange={(event) => {
                const nextSort = event.target.value as ChangeSortKey;
                setSortKey(nextSort);
                setDirection(nextSort === "issuerName" ? "asc" : "desc");
              }}
            >
              {(Object.keys(sortLabelKeys) as ChangeSortKey[]).map((item) => (
                <option key={item} value={item}>
                  {t(sortLabelKeys[item])}
                </option>
              ))}
            </select>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-stone-50"
              onClick={() => setDirection(direction === "asc" ? "desc" : "asc")}
            >
              <DirectionIcon className="h-4 w-4" />
              {direction === "asc" ? t("ascending") : t("descending")}
            </button>
          </div>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <p className="border-b border-stone-100 px-4 py-2 text-xs text-stone-500 md:hidden">{t("scrollForMoreColumns")}</p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="sticky top-0 z-10 bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-stone-600">{t("issuer")}</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600">{t("action")}</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">{t("currentShares")}</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">{t("shareChange")}</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">{t("shareChangePercent")}</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">{t("weightChange")}</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">{t("valueChange")}</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">{t("weight")}</th>
                {onSelectHolding ? <th className="px-4 py-3 text-right font-medium text-stone-600">{t("viewDetails")}</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filtered.map((holding) => (
                <tr
                  key={`${holding.cusip}-${holding.action}`}
                  className={onSelectHolding ? "cursor-pointer hover:bg-stone-50" : "hover:bg-stone-50"}
                  onClick={() => onSelectHolding?.(holding)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{holding.issuerName}</p>
                    <p className="font-mono text-xs text-stone-500">{holding.cusip}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ${badgeClass(holding.action)}`}>
                      {actionLabel(holding.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">{holding.shares.toLocaleString("en-US")}</td>
                  <td className="px-4 py-3 text-right text-stone-700">{(holding.shareChange ?? 0).toLocaleString("en-US")}</td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {holding.shareChangePercent == null ? "-" : `${holding.shareChangePercent.toFixed(2)}%`}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">{(holding.weightChange ?? 0).toFixed(2)} {t("points")}</td>
                  <td className="px-4 py-3 text-right text-stone-700">{money(holding.valueChange ?? 0)}</td>
                  <td className="px-4 py-3 text-right text-stone-700">{holding.portfolioWeight.toFixed(2)}%</td>
                  {onSelectHolding ? (
                    <td className="px-4 py-3 text-right text-stone-400">
                      <span className="inline-flex items-center justify-end gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        {t("viewDetails")}
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
