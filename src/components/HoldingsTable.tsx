import { ArrowUpDown, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { useLanguage } from "../i18n";
import type { Holding } from "../types/holding";

type SortKey = "issuerName" | "value" | "shares" | "portfolioWeight" | "averageCost" | "relativeCostReturn";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function unitMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function relativeCostReturn(holding: Holding): number | null {
  const basis = holding.cost.basis;
  return basis != null && basis > 0 ? (holding.value / basis - 1) * 100 : null;
}

function RelativeCostReturnValue({ holding }: { holding: Holding }) {
  const value = relativeCostReturn(holding);
  if (value == null) return <span className="text-stone-400">—</span>;
  return (
    <span className={`font-semibold tabular-nums ${value > 0 ? "text-emerald-700" : value < 0 ? "text-red-700" : "text-stone-600"}`}>
      {value > 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export default function HoldingsTable({ holdings, onSelectHolding }: { holdings: Holding[]; onSelectHolding?: (holding: Holding) => void }) {
  const { t, trendLabel } = useLanguage();
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const maxWeight = Math.max(...holdings.map((holding) => holding.portfolioWeight), 1);

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      if (sortKey === "averageCost" || sortKey === "relativeCostReturn") {
        const aValue = sortKey === "averageCost" ? a.cost.averagePrice : relativeCostReturn(a);
        const bValue = sortKey === "averageCost" ? b.cost.averagePrice : relativeCostReturn(b);
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      const aValue = a[sortKey] ?? "";
      const bValue = b[sortKey] ?? "";
      const result = typeof aValue === "string" ? aValue.localeCompare(String(bValue)) : Number(aValue) - Number(bValue);
      return direction === "asc" ? result : -result;
    });
  }, [direction, holdings, sortKey]);

  function setSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(nextKey);
      setDirection(nextKey === "issuerName" ? "asc" : "desc");
    }
  }

  const header = (key: SortKey, label: string) => (
    <button className="inline-flex items-center gap-1 font-medium text-stone-600 hover:text-ink" onClick={() => setSort(key)}>
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );

  const costStatusLabel = (holding: Holding) => {
    if (holding.cost.status === "official") return t("costOfficial");
    if (holding.cost.status === "hybrid") return t("costHybrid");
    if (holding.cost.status === "estimated") return t("costEstimated");
    return t("costUnavailable");
  };

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <p className="border-b border-stone-100 px-4 py-2 text-xs text-stone-500 md:hidden">{t("scrollForMoreColumns")}</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="sticky top-0 z-10 bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left">{header("issuerName", t("issuer"))}</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">{t("ticker")}</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">{t("trend")}</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">CUSIP</th>
              <th className="px-4 py-3 text-right">{header("value", t("value"))}</th>
              <th className="px-4 py-3 text-right">{header("shares", t("shares"))}</th>
              <th className="px-4 py-3 text-right">{header("averageCost", t("averageCost"))}</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">{header("relativeCostReturn", t("relativeCostReturn"))}</th>
              <th className="px-4 py-3 text-right">{header("portfolioWeight", t("weight"))}</th>
              {onSelectHolding ? <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-stone-600">{t("viewDetails")}</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {sortedHoldings.map((holding) => (
              <tr
                key={holding.cusip ?? holding.issuerName ?? "holding"}
                className={onSelectHolding ? "cursor-pointer hover:bg-stone-50" : "hover:bg-stone-50"}
                onClick={() => onSelectHolding?.(holding)}
              >
                <td className="max-w-xs px-4 py-3 font-medium text-ink">{holding.issuerName}</td>
                <td className="px-4 py-3 text-stone-500">{holding.ticker ?? "-"}</td>
                <td className="px-4 py-3 text-stone-600">{trendLabel(holding.trend)}</td>
                <td className="px-4 py-3 font-mono text-xs text-stone-500">{holding.cusip}</td>
                <td className="px-4 py-3 text-right text-stone-700">{money(holding.value)}</td>
                <td className="px-4 py-3 text-right text-stone-700">{holding.shares.toLocaleString("en-US")}</td>
                <td className="px-4 py-3 text-right text-stone-700">
                  <div className="flex min-w-28 flex-col items-end gap-1">
                    <span className="font-medium text-ink">
                      {holding.cost.averagePrice == null ? "-" : `≈ ${unitMoney(holding.cost.averagePrice)}`}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        holding.cost.status === "official"
                          ? "bg-blue-50 text-blue-700"
                          : holding.cost.status === "hybrid"
                            ? "bg-violet-50 text-violet-700"
                            : holding.cost.status === "estimated"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {costStatusLabel(holding)}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <RelativeCostReturnValue holding={holding} />
                </td>
                <td className="px-4 py-3 text-right text-stone-700">
                  <div className="flex min-w-28 items-center justify-end gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-moss"
                        style={{ width: `${Math.max((holding.portfolioWeight / maxWeight) * 100, 3)}%` }}
                      />
                    </div>
                    <span className="w-14 text-right">{holding.portfolioWeight.toFixed(2)}%</span>
                  </div>
                </td>
                {onSelectHolding ? (
                  <td className="whitespace-nowrap px-4 py-3 text-right text-stone-400">
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
  );
}
