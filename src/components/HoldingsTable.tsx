import { ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { Holding } from "../types/holding";

type SortKey = "issuerName" | "value" | "shares" | "portfolioWeight";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
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

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left">{header("issuerName", "Issuer")}</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">Ticker</th>
              <th className="px-4 py-3 text-left font-medium text-stone-600">CUSIP</th>
              <th className="px-4 py-3 text-right">{header("value", "Value")}</th>
              <th className="px-4 py-3 text-right">{header("shares", "Shares")}</th>
              <th className="px-4 py-3 text-right">{header("portfolioWeight", "Weight")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {sortedHoldings.map((holding) => (
              <tr key={holding.cusip ?? holding.issuerName ?? "holding"} className="hover:bg-stone-50">
                <td className="max-w-xs px-4 py-3 font-medium text-ink">{holding.issuerName}</td>
                <td className="px-4 py-3 text-stone-500">{holding.ticker ?? "-"}</td>
                <td className="px-4 py-3 font-mono text-xs text-stone-500">{holding.cusip}</td>
                <td className="px-4 py-3 text-right text-stone-700">{money(holding.value)}</td>
                <td className="px-4 py-3 text-right text-stone-700">{holding.shares.toLocaleString("en-US")}</td>
                <td className="px-4 py-3 text-right text-stone-700">{holding.portfolioWeight.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
