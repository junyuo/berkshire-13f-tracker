import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Action, Holding } from "../types/holding";

const actionLabels: { action: Action; className: string }[] = [
  { action: "New Position", className: "bg-blue-600" },
  { action: "Added", className: "bg-emerald-600" },
  { action: "Reduced", className: "bg-red-600" },
  { action: "Sold Out", className: "bg-stone-700" },
  { action: "Unchanged", className: "bg-stone-300" },
];

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
  const changedCount = changes.filter((holding) => holding.action !== "Unchanged").length;
  const unchangedCount = countByAction(changes, "Unchanged");
  const changedRate = changes.length ? (changedCount / changes.length) * 100 : 0;
  const largestIncrease = [...changes]
    .filter((holding) => (holding.weightChange ?? 0) > 0)
    .sort((a, b) => (b.weightChange ?? 0) - (a.weightChange ?? 0))[0];
  const largestDecrease = [...changes]
    .filter((holding) => (holding.weightChange ?? 0) < 0)
    .sort((a, b) => Math.abs(b.weightChange ?? 0) - Math.abs(a.weightChange ?? 0))[0];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ink">Change Mix</h2>
          <p className="text-sm text-stone-500">What changed in the latest 13F-HR filing versus the prior quarter.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {actionLabels.map(({ action, className }) => (
            <div key={action} className="rounded-md border border-stone-200 px-3 py-2 text-center">
              <span className={`mx-auto block h-1.5 w-8 rounded-full ${className}`} />
              <p className="mt-2 text-xl font-semibold text-ink">{countByAction(changes, action)}</p>
              <p className="text-xs text-stone-500">{action}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-md bg-stone-50 p-4 ring-1 ring-stone-200 md:col-span-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-ink">Changed positions</span>
            <span className="text-stone-600">
              {changedCount} changed / {unchangedCount} unchanged
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-moss" style={{ width: `${changedRate}%` }} />
          </div>
          <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-stone-100" aria-label="Change mix by action">
            {actionLabels.map(({ action, className }) => {
              const count = countByAction(changes, action);
              return (
                <div
                  key={action}
                  className={`${className} min-w-[2px]`}
                  style={{ width: `${changes.length ? (count / changes.length) * 100 : 0}%` }}
                  title={`${action}: ${count}`}
                />
              );
            })}
          </div>
        </div>
        <div className="rounded-md bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <ArrowUpRight className="h-4 w-4" />
            Largest weight increase
          </div>
          <p className="mt-2 font-semibold text-ink">{largestIncrease?.issuerName ?? "No increases reported"}</p>
          <p className="text-sm text-emerald-700">
            {largestIncrease ? `+${(largestIncrease.weightChange ?? 0).toFixed(2)} pts` : "-"}
          </p>
          <p className="mt-1 text-xs text-stone-500">{largestIncrease ? `${money(largestIncrease.valueChange ?? 0)} value change` : ""}</p>
        </div>
        <div className="rounded-md bg-red-50 p-4 ring-1 ring-red-100">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
            <ArrowDownRight className="h-4 w-4" />
            Largest weight decrease
          </div>
          <p className="mt-2 font-semibold text-ink">{largestDecrease?.issuerName ?? "No reductions reported"}</p>
          <p className="text-sm text-red-700">
            {largestDecrease ? `${(largestDecrease.weightChange ?? 0).toFixed(2)} pts` : "-"}
          </p>
          <p className="mt-1 text-xs text-stone-500">{largestDecrease ? `${money(largestDecrease.valueChange ?? 0)} value change` : ""}</p>
        </div>
      </div>
    </section>
  );
}
