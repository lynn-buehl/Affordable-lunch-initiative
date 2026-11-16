import Link from "next/link";
import { Plus, Camera } from "lucide-react";
import { getMemberBalances, getRecentLedgerEntries } from "@/lib/db/queries/ledger";
import { BalanceTable } from "@/components/finance/BalanceTable";
import { LedgerLog } from "@/components/finance/LedgerLog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";

export default async function FinancePage() {
  const [balances, entries] = await Promise.all([
    getMemberBalances(),
    getRecentLedgerEntries(),
  ]);

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <PageHeader
        title="Finance"
        subtitle="Group balances and spending log"
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/finance/scan">
              <Button variant="secondary">
                <Camera size={16} /> Scan receipt
              </Button>
            </Link>
            <Link href="/finance/entry">
              <Button>
                <Plus size={16} /> Log spending
              </Button>
            </Link>
          </div>
        }
      />
      <BalanceTable balances={balances} />
      <div>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Recent entries</h2>
        <LedgerLog entries={entries} />
      </div>
    </div>
  );
}
