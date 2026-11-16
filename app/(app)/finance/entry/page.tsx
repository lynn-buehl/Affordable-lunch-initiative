import { auth } from "@/lib/auth/config";
import { getAllUsers } from "@/lib/db/queries/users";
import { LedgerEntryForm } from "@/components/finance/LedgerEntryForm";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function FinanceEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ aliEventId?: string; description?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const isAdmin = session?.user?.role === "admin";

  const members = isAdmin
    ? (await getAllUsers())
        .filter((u) => u.status === "active")
        .map((u) => ({ id: u.id, name: u.name }))
    : null;

  return (
    <div className="animate-in">
      <PageHeader title="Log spending" subtitle="Add a contribution or expense" />
      <LedgerEntryForm
        members={members}
        aliEventId={params.aliEventId}
        defaultDescription={params.description}
      />
    </div>
  );
}
