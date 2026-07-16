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
  const moves = changes
    .filter(
      (holding) =>
        holding.action === "New Position" ||
        holding.action === "Sold Out" ||
        Math.abs(holding.shareChangePercent ?? 0) >= 10 ||
        Math.abs(holding.weightChange ?? 0) >= 0.5,
    )
    .sort((a, b) => Math.abs(b.weightChange ?? 0) - Math.abs(a.weightChange ?? 0))
    .slice(0, 8);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-ink">{t("meaningfulMoves")}</h2>
        <p className="text-sm text-stone-500">{t("meaningfulMovesSubtitle")}</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="py-2 pr-4 font-medium">{t("issuer")}</th>
              <th className="py-2 pr-4 font-medium">{t("action")}</th>
              <th className="py-2 pr-4 text-right font-medium">{t("shareChangePercent")}</th>
              <th className="py-2 text-right font-medium">{t("weightChange")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {moves.map((holding) => (
              <tr key={`${holding.cusip}-${holding.action}`}>
                <td className="py-3 pr-4">
                  <p className="font-medium text-ink">{holding.issuerName}</p>
                  <p className="text-xs text-stone-500">{holding.ticker ?? holding.cusip}</p>
                </td>
                <td className="py-3 pr-4 text-stone-700">{actionLabel(holding.action)}</td>
                <td className="py-3 pr-4 text-right text-stone-700">{formatPercent(holding.shareChangePercent)}</td>
                <td className="py-3 text-right text-stone-700">{formatPoints(holding.weightChange, t("points"))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
