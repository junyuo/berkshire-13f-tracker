import HoldingsTable from "../components/HoldingsTable";
import type { Holding } from "../types/holding";

export default function Holdings({ holdings }: { holdings: Holding[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Current Holdings</h2>
        <p className="mt-1 text-sm text-stone-500">Complete holdings from the latest Berkshire Hathaway 13F-HR filing.</p>
      </div>
      <HoldingsTable holdings={holdings} />
    </div>
  );
}
