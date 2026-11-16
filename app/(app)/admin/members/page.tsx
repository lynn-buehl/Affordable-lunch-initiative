import { getAllUsers } from "@/lib/db/queries/users";
import { getMemberBalances } from "@/lib/db/queries/ledger";
import { MembersTable } from "@/components/admin/MembersTable";
import { AddMemberDialog } from "@/components/admin/AddMemberDialog";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AdminMembersPage() {
  const [members, balances] = await Promise.all([getAllUsers(), getMemberBalances()]);
  const computedBalances = new Map(
    balances.map((balance) => [balance.userId, balance.computedBalance]),
  );

  return (
    <div className="animate-in">
      <PageHeader
        title="Members"
        subtitle="Add members and manage who's active in ALI"
        action={<AddMemberDialog existingNames={members.map((m) => m.name)} />}
      />
      <MembersTable members={members} computedBalances={computedBalances} />
    </div>
  );
}
