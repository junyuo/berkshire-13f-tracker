import { useState } from "react";
import ChangesTable from "../components/ChangesTable";
import type { Action, Holding } from "../types/holding";

export default function Changes({ changes }: { changes: Holding[] }) {
  const [action, setAction] = useState<Action | "All">("All");

  return (
    <div className="space-y-4">
      <ChangesTable changes={changes} action={action} onActionChange={setAction} />
    </div>
  );
}
