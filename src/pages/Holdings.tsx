import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import HoldingDetailPanel from "../components/HoldingDetailPanel";
import HoldingsTable from "../components/HoldingsTable";
import type { Holding, QuarterData } from "../types/holding";

export default function Holdings({ holdings, quarters }: { holdings: Holding[]; quarters: QuarterData[] }) {
  const [query, setQuery] = useState("");
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  const filteredHoldings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return holdings;

    return holdings.filter((holding) =>
      [holding.issuerName, holding.ticker, holding.cusip].some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [holdings, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Current Holdings</h2>
          <p className="mt-1 text-sm text-stone-500">Complete holdings from the latest Berkshire Hathaway 13F-HR filing.</p>
        </div>
        <label className="relative block lg:w-80">
          <span className="sr-only">Search holdings</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            className="w-full rounded-md border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none ring-moss/20 placeholder:text-stone-400 focus:border-moss focus:ring-4"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search issuer, ticker, or CUSIP"
          />
        </label>
      </div>
      {filteredHoldings.length ? (
        <HoldingsTable holdings={filteredHoldings} onSelectHolding={setSelectedHolding} />
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center text-sm text-stone-500 shadow-sm">
          No holdings match "{query.trim()}".
        </div>
      )}
      <HoldingDetailPanel holding={selectedHolding} quarters={quarters} onClose={() => setSelectedHolding(null)} />
    </div>
  );
}
