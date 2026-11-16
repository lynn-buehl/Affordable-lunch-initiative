import type { MemberBalance } from "@/lib/db/queries/ledger";
import { formatCents } from "@/lib/money";
import tableStyles from "@/components/ui/Table.module.css";

function AmountCell({ cents }: { cents: number }) {
  const cls =
    cents > 0 ? tableStyles.positive : cents < 0 ? tableStyles.negative : "";
  return <td className={`${tableStyles.numeric} ${cls}`}>{formatCents(cents)}</td>;
}

export function BalanceTable({ balances }: { balances: MemberBalance[] }) {
  return (
    <div className={tableStyles.wrapper}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Member</th>
            <th className={tableStyles.numeric}>Contributions</th>
            <th className={tableStyles.numeric}>Expenses fronted</th>
            <th className={tableStyles.numeric}>Fair share</th>
            <th className={tableStyles.numeric}>Computed balance</th>
            <th className={tableStyles.numeric}>Adjustment</th>
            <th className={tableStyles.numeric}>Final balance</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((balance) => (
            <tr key={balance.userId}>
              <td>{balance.name}</td>
              <td className={tableStyles.numeric}>
                {formatCents(balance.totalContributions)}
              </td>
              <td className={tableStyles.numeric}>
                {formatCents(balance.totalExpensesFronted)}
              </td>
              <td className={tableStyles.numeric}>{formatCents(balance.fairShare)}</td>
              <AmountCell cents={balance.computedBalance} />
              <td className={tableStyles.numeric}>
                {formatCents(balance.adjustmentsTotal)}
              </td>
              <AmountCell cents={balance.finalBalance} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
