"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, X, RotateCcw } from "lucide-react";
import { scanReceiptAction, saveReceiptAction } from "@/lib/receipts/actions";
import type { ExtractedReceipt } from "@/lib/receipts/extract";
import { formatCents, parseEuroInput } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { FormMessage } from "@/components/ui/FormMessage";
import { downscaleImage } from "./downscale";
import styles from "./ReceiptScanner.module.css";

type Line = ExtractedReceipt["items"][number] & { key: number };

const today = () => new Date().toISOString().slice(0, 10);
const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/**
 * Photo of a receipt -> reviewable list of what was bought -> one tap to
 * save it and log the expense. Nothing is saved until the person confirms,
 * because a misread total would otherwise land straight in the ledger.
 */
export function ReceiptScanner({
  aliEventId,
  defaultDescription,
  ingredients,
  canComplete,
  redirectTo,
}: {
  aliEventId: string | null;
  defaultDescription: string;
  ingredients: { id: string; name: string }[];
  /** Offer "mark this ALI completed" (organizer/admin, while shopping). */
  canComplete: boolean;
  /** Where to go after saving; stays on the page and refreshes if omitted. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "scanning" | "review" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [store, setStore] = useState("");
  const [date, setDate] = useState(today());
  const [total, setTotal] = useState("");
  const [description, setDescription] = useState(defaultDescription);
  const [markCompleted, setMarkCompleted] = useState(canComplete);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPhase("scanning");
    try {
      const formData = new FormData();
      formData.set("image", await downscaleImage(file));
      const result = await scanReceiptAction(formData);
      if (!result.ok) {
        setError(result.error);
        setPhase("idle");
        return;
      }
      const { receipt } = result;
      const sum = receipt.items.reduce((acc, item) => acc + item.priceCents, 0);
      setLines(receipt.items.map((item, index) => ({ ...item, key: index })));
      setStore(receipt.store ?? "");
      setDate(receipt.purchaseDate ?? today());
      setTotal(centsToInput(receipt.totalCents ?? sum));
      setPhase("review");
    } catch {
      setError("The upload failed. Check your connection and try again.");
      setPhase("idle");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save() {
    const totalCents = parseEuroInput(total);
    if (totalCents === null || totalCents <= 0) {
      setError("Enter the total like 23,45.");
      return;
    }
    setError(null);
    setPhase("saving");
    try {
      const result = await saveReceiptAction({
        aliEventId,
        store: store.trim() || null,
        purchaseDate: date,
        totalCents,
        description: description.trim(),
        markCompleted: canComplete && markCompleted,
        items: lines.map(({ rawName, name, quantity, priceCents, ingredientId }) => ({
          rawName,
          name,
          quantity,
          priceCents,
          ingredientId,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        setPhase("review");
        return;
      }
      setPhase("saved");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch {
      setError("Saving failed. Check your connection and try again.");
      setPhase("review");
    }
  }

  function reset() {
    setPhase("idle");
    setLines([]);
    setError(null);
  }

  if (phase === "saved") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        <FormMessage kind="success">Receipt saved and the expense is logged.</FormMessage>
        <Button variant="secondary" size="sm" onClick={reset}>
          Scan another receipt
        </Button>
      </div>
    );
  }

  if (phase === "idle" || phase === "scanning") {
    const scanning = phase === "scanning";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {error ? <FormMessage kind="error">{error}</FormMessage> : null}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          data-testid="receipt-file"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className={styles.drop}
          disabled={scanning}
          onClick={() => fileInput.current?.click()}
        >
          {scanning ? <Loader2 size={28} className={styles.spin} /> : <Camera size={28} />}
          <span className={styles.dropTitle}>
            {scanning ? "Reading the receipt…" : "Scan the receipt"}
          </span>
          <span className={styles.dropHint}>
            {scanning
              ? "This takes a few seconds."
              : "Take a photo of the whole Kassenbon. Every item and the total are filled in for you."}
          </span>
        </button>
      </div>
    );
  }

  const itemSum = lines.reduce((acc, line) => acc + line.priceCents, 0);
  const totalCents = parseEuroInput(total);
  const mismatch = totalCents !== null && totalCents !== itemSum;
  const matchedCount = lines.filter((l) => l.ingredientId).length;
  const saving = phase === "saving";

  return (
    <div className={styles.review}>
      {error ? <FormMessage kind="error">{error}</FormMessage> : null}

      <div className={styles.fields}>
        <TextField id="receipt-store" label="Shop" value={store} onChange={(e) => setStore(e.target.value)} />
        <TextField
          id="receipt-date"
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <TextField
          id="receipt-total"
          label="Total paid (€)"
          inputMode="decimal"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          required
        />
      </div>
      <TextField
        id="receipt-description"
        label="Description in the spending log"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      <div>
        <ul className={styles.lines}>
          {lines.map((line) => (
            <li key={line.key} className={styles.line}>
              <div className={styles.lineName}>
                <span className={styles.lineTitle}>
                  {line.quantity > 1 ? `${line.quantity}× ` : ""}
                  {line.name}
                </span>
                <span className={styles.lineRaw}>{line.rawName}</span>
              </div>
              <span className={styles.linePrice}>{formatCents(line.priceCents)}</span>
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${line.name}`}
                onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
              >
                <X size={16} />
              </button>
              <select
                className={`${styles.match} ${line.ingredientId ? styles.matched : ""}`}
                aria-label={`Ingredient for ${line.name}`}
                value={line.ingredientId ?? ""}
                onChange={(e) =>
                  setLines((all) =>
                    all.map((l) =>
                      l.key === line.key ? { ...l, ingredientId: e.target.value || null } : l,
                    ),
                  )
                }
              >
                <option value="">Not an ALI ingredient</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        <div className={styles.summary} style={{ marginTop: 10 }}>
          <span>
            {lines.length} {lines.length === 1 ? "line" : "lines"} · {matchedCount} matched to ALI ingredients
          </span>
          <span className={mismatch ? styles.warning : undefined}>
            Lines add up to {formatCents(itemSum)}
            {mismatch ? ", which differs from the total. Check the photo caught everything." : ""}
          </span>
        </div>
      </div>

      {canComplete ? (
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={markCompleted}
            onChange={(e) => setMarkCompleted(e.target.checked)}
          />
          Shopping&apos;s done: mark this ALI completed
        </label>
      ) : null}

      <div className={styles.actions}>
        <Button onClick={save} disabled={saving || description.trim().length === 0}>
          {saving ? "Saving…" : `Save and log ${totalCents ? formatCents(totalCents) : "expense"}`}
        </Button>
        <Button variant="ghost" onClick={reset} disabled={saving}>
          <RotateCcw size={15} /> Start over
        </Button>
      </div>
    </div>
  );
}
