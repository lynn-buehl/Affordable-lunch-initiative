import type { LedgerEntryWithUser } from "@/lib/db/queries/ledger";
import { formatCents } from "@/lib/money";
import tableStyles from "@/components/ui/Table.module.css";

const dateFormatter = new Intl.DateTimeFormat("de-DE");

export function LedgerLog({ entries }: { entries: LedgerEntryWithUser[] }) {
  return (
    <div className={tableStyles.wrapper}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Member</th>
            <th>Type</th>
            <th>Description</th>
            <th className={tableStyles.numeric}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ color: "var(--text-subtle)" }}>
                No entries yet.
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id}>
                <td>{dateFormatter.format(new Date(entry.entryDate))}</td>
                <td>{entry.userName}</td>
                <td style={{ textTransform: "capitalize" }}>{entry.entryType}</td>
                <td>{entry.description}</td>
                <td className={tableStyles.numeric}>{formatCents(entry.amountCents)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
