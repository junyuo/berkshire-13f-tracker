import { useState } from "react";
import ChangesTable, { type ChangeFilter } from "../components/ChangesTable";
import HoldingDetailPanel from "../components/HoldingDetailPanel";
import type { Holding, QuarterData } from "../types/holding";

export default function Changes({ changes, quarters }: { changes: Holding[]; quarters: QuarterData[] }) {
  const [action, setAction] = useState<ChangeFilter>("Changed");
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  return (
    <div className="space-y-4">
      <ChangesTable changes={changes} action={action} onActionChange={setAction} onSelectHolding={setSelectedHolding} />
      <HoldingDetailPanel holding={selectedHolding} quarters={quarters} onClose={() => setSelectedHolding(null)} />
    </div>
  );
}
