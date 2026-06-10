import { CircleDollarSign, Layers, Target } from "lucide-react";
import type { Holding } from "../types/holding";

function weight(holdings: Holding[], count: number): number {
  return holdings.slice(0, count).reduce((sum, holding) => sum + holding.portfolioWeight, 0);
}

function deltaLabel(delta: number): string {
  if (Math.abs(delta) < 0.005) return "Flat QoQ";
  return `${delta > 0 ? "+" : ""}${delta.toFixed(2)} pts QoQ`;
}

function deltaClass(delta: number): string {
  if (delta > 0) return "text-emerald-700";
  if (delta < 0) return "text-red-700";
  return "text-stone-500";
}

export default function ConcentrationCards({ holdings, previousHoldings }: { holdings: Holding[]; previousHoldings: Holding[] }) {
  const apple = holdings.find((holding) => holding.ticker === "AAPL" || holding.cusip === "037833100");
  const previousApple = previousHoldings.find((holding) => holding.ticker === "AAPL" || holding.cusip === "037833100");
  const cards = [
    { label: "Top 5 Weight", value: weight(holdings, 5), previous: weight(previousHoldings, 5), icon: Target },
    { label: "Top 10 Weight", value: weight(holdings, 10), previous: weight(previousHoldings, 10), icon: Layers },
    { label: "Apple Weight", value: apple?.portfolioWeight ?? 0, previous: previousApple?.portfolioWeight ?? 0, icon: CircleDollarSign },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-stone-500">{card.label}</p>
              <Icon className="h-5 w-5 text-brass" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-ink">{card.value.toFixed(2)}%</p>
            <p className={`mt-1 text-sm font-medium ${deltaClass(card.value - card.previous)}`}>
              {deltaLabel(card.value - card.previous)}
            </p>
          </div>
        );
      })}
    </section>
  );
}
