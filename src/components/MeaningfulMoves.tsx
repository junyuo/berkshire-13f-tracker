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

export default function MeaningfulMoves({ changes }: { changes: Holding[] }) {
  const { actionLabel, t } = useLanguage();
  const important = changes
    .filter((holding) => Math.abs(holding.shareChangePercent ?? 0) >= 10 || Math.abs(holding.weightChange ?? 0) >= 0.5)
    .sort((a, b) => Math.abs(b.weightChange ?? 0) - Math.abs(a.weightChange ?? 0));
  const categories = [
    {
      label: t("newOrSoldOut"),
      items: changes.filter((holding) => holding.action === "New Position" || holding.action === "Sold Out"),
    },
    {
      label: t("largeAdds"),
      items: important.filter((holding) => holding.action === "Added" && (holding.shareChangePercent ?? 0) >= 10),
    },
    {
      label: t("largeTrims"),
      items: important.filter((holding) => holding.action === "Reduced" && (holding.shareChangePercent ?? 0) <= -10),
    },
    {
      label: t("weightOnlyMoves"),
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
          <div key={category.label} className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">{category.label}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-stone-500 ring-1 ring-stone-200">
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
                    <p className="text-right text-xs font-medium text-stone-700">{formatPoints(holding.weightChange, t("points"))}</p>
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
        ))}
      </div>
    </section>
  );
}
