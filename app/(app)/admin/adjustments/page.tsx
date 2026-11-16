import { getAllUsers } from "@/lib/db/queries/users";
import { AdjustmentForm } from "@/components/finance/AdjustmentForm";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AdminAdjustmentsPage() {
  const members = (await getAllUsers())
    .filter((u) => u.status === "active")
    .map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="animate-in">
      <PageHeader title="Manual adjustment" subtitle="Correct a balance or do final balancing" />
      <AdjustmentForm members={members} />
    </div>
  );
}
