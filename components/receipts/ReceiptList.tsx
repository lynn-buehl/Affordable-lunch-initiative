import type { ReceiptWithItems } from "@/lib/db/queries/receipts";
import { formatCents } from "@/lib/money";
import styles from "./ReceiptScanner.module.css";

const dateFormatter = new Intl.DateTimeFormat("de-DE");

export function ReceiptList({ receipts }: { receipts: ReceiptWithItems[] }) {
  return (
    <div className={styles.saved}>
      {receipts.map((receipt) => (
        <div key={receipt.id}>
          <div className={styles.savedHead}>
            <span>
              <strong>{receipt.store ?? "Receipt"}</strong>{" "}
              <span className={styles.savedMeta}>
                {receipt.purchaseDate ? `${dateFormatter.format(new Date(receipt.purchaseDate))} · ` : ""}
                paid by {receipt.uploadedByName}
              </span>
            </span>
            <strong>{formatCents(receipt.totalCents)}</strong>
          </div>
          <ul className={styles.savedItems}>
            {receipt.items.map((item) => (
              <li key={item.id} className={styles.savedItem} title={item.rawName}>
                <span className={item.matched ? undefined : styles.other}>
                  {item.quantity > 1 ? `${item.quantity}× ` : ""}
                  {item.name}
                </span>
                <span>{formatCents(item.priceCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
