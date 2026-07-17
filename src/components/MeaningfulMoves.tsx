import { useLanguage } from "../i18n";
import type { Holding } from "../types/holding";

function formatPercent(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPoints(value: number | undefined, pointsLabel: string): string {
  const safeValue = value ?? 0;
  return `${safeValue > 0 ? "+" : ""}${safeValue.toFixed(2)} ${pointsLabel}`;
}

const tones = {
  blue: {
    bar: "bg-blue-600",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    value: "text-blue-700",
  },
  green: {
    bar: "bg-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    value: "text-emerald-700",
  },
  red: {
    bar: "bg-red-600",
    badge: "bg-red-50 text-red-700 ring-red-200",
    value: "text-red-700",
  },
  amber: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    value: "text-amber-700",
  },
};

export default function MeaningfulMoves({ changes }: { changes: Holding[] }) {
  const { actionLabel, t } = useLanguage();
  const important = changes
    .filter((holding) => Math.abs(holding.shareChangePercent ?? 0) >= 10 || Math.abs(holding.weightChange ?? 0) >= 0.5)
    .sort((a, b) => Math.abs(b.weightChange ?? 0) - Math.abs(a.weightChange ?? 0));
  const categories = [
    {
      label: t("newOrSoldOut"),
      tone: tones.blue,
      items: changes.filter((holding) => holding.action === "New Position" || holding.action === "Sold Out"),
    },
    {
      label: t("largeAdds"),
      tone: tones.green,
      items: important.filter((holding) => holding.action === "Added" && (holding.shareChangePercent ?? 0) >= 10),
    },
    {
      label: t("largeTrims"),
      tone: tones.red,
      items: important.filter((holding) => holding.action === "Reduced" && (holding.shareChangePercent ?? 0) <= -10),
    },
    {
      label: t("weightOnlyMoves"),
      tone: tones.amber,
      items: important.filter(
        (holding) =>
          holding.action !== "New Position" &&
          holding.action !== "Sold Out" &&
          Math.abs(holding.weightChange ?? 0) >= 0.5 &&
          Math.abs(holding.shareChangePercent ?? 0) < 10,
      ),
    },
  ];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-ink">{t("changeImpactMatrix")}</h2>
        <p className="text-sm text-stone-500">{t("changeImpactSubtitle")}</p>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {categories.map((category) => (
          <div key={category.label} className="overflow-hidden rounded-md border border-stone-200 bg-stone-50">
            <div className={`h-1 ${category.tone.bar}`} />
            <div className="p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">{category.label}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${category.tone.badge}`}>
                {category.items.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {category.items.slice(0, 4).map((holding) => (
                <div key={`${category.label}-${holding.cusip}-${holding.action}`} className="rounded bg-white p-2 ring-1 ring-stone-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{holding.ticker ?? holding.issuerName}</p>
                      <p className="text-xs text-stone-500">{actionLabel(holding.action)}</p>
                    </div>
                    <p className={`text-right text-xs font-semibold ${category.tone.value}`}>
                      {formatPoints(holding.weightChange, t("points"))}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-500">
                    <span>{t("shareChangePercent")}</span>
                    <span>{formatPercent(holding.shareChangePercent)}</span>
                  </div>
                </div>
              ))}
              {!category.items.length ? <p className="py-3 text-sm text-stone-500">{t("noItems")}</p> : null}
            </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
