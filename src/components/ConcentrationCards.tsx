import { CircleDollarSign, Layers, Target } from "lucide-react";
import type { Holding } from "../types/holding";

function weight(holdings: Holding[], count: number): string {
  return `${holdings.slice(0, count).reduce((sum, holding) => sum + holding.portfolioWeight, 0).toFixed(2)}%`;
}

export default function ConcentrationCards({ holdings }: { holdings: Holding[] }) {
  const apple = holdings.find((holding) => holding.ticker === "AAPL" || holding.cusip === "037833100");
  const cards = [
    { label: "Top 5 Weight", value: weight(holdings, 5), icon: Target },
    { label: "Top 10 Weight", value: weight(holdings, 10), icon: Layers },
    { label: "Apple Weight", value: `${(apple?.portfolioWeight ?? 0).toFixed(2)}%`, icon: CircleDollarSign },
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
            <p className="mt-3 text-2xl font-semibold text-ink">{card.value}</p>
          </div>
        );
      })}
    </section>
  );
}
