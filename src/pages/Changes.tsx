import { useState } from "react";
import ChangesTable, { type ChangeFilter } from "../components/ChangesTable";
import type { Holding } from "../types/holding";

export default function Changes({ changes }: { changes: Holding[] }) {
  const [action, setAction] = useState<ChangeFilter>("Changed");

  return (
    <div className="space-y-4">
      <ChangesTable changes={changes} action={action} onActionChange={setAction} />
    </div>
  );
}
