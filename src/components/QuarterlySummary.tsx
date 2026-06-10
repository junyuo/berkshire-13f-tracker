import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Action, Holding } from "../types/holding";

const actionLabels: Action[] = ["New Position", "Added", "Reduced", "Sold Out", "Unchanged"];

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function countByAction(changes: Holding[], action: Action): number {
  return changes.filter((holding) => holding.action === action).length;
}

export default function QuarterlySummary({ changes }: { changes: Holding[] }) {
  const largestIncrease = [...changes]
    .filter((holding) => (holding.valueChange ?? 0) > 0)
    .sort((a, b) => (b.valueChange ?? 0) - (a.valueChange ?? 0))[0];
  const largestDecrease = [...changes]
    .filter((holding) => (holding.valueChange ?? 0) < 0)
    .sort((a, b) => Math.abs(b.valueChange ?? 0) - Math.abs(a.valueChange ?? 0))[0];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ink">Quarterly Change Summary</h2>
          <p className="text-sm text-stone-500">Latest 13F-HR filing compared with the prior quarter.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {actionLabels.map((action) => (
            <div key={action} className="rounded-md border border-stone-200 px-3 py-2 text-center">
              <p className="text-xl font-semibold text-ink">{countByAction(changes, action)}</p>
              <p className="text-xs text-stone-500">{action}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-md bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <ArrowUpRight className="h-4 w-4" />
            Largest increase
          </div>
          <p className="mt-2 font-semibold text-ink">{largestIncrease?.issuerName ?? "No increases reported"}</p>
          <p className="text-sm text-emerald-700">{largestIncrease ? money(largestIncrease.valueChange ?? 0) : "-"}</p>
        </div>
        <div className="rounded-md bg-red-50 p-4 ring-1 ring-red-100">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
            <ArrowDownRight className="h-4 w-4" />
            Largest decrease
          </div>
          <p className="mt-2 font-semibold text-ink">{largestDecrease?.issuerName ?? "No reductions reported"}</p>
          <p className="text-sm text-red-700">{largestDecrease ? money(largestDecrease.valueChange ?? 0) : "-"}</p>
        </div>
      </div>
    </section>
  );
}
