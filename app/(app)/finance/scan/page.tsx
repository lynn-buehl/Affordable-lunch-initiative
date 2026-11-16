import Link from "next/link";
import { getActiveIngredients } from "@/lib/db/queries/ingredients";
import { isReceiptScanningConfigured } from "@/lib/receipts/extract";
import { ReceiptScanner } from "@/components/receipts/ReceiptScanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function ScanReceiptPage() {
  const ingredients = await getActiveIngredients();

  return (
    <div className="animate-in" style={{ maxWidth: 640 }}>
      <PageHeader
        title="Scan a receipt"
        subtitle="Photograph the Kassenbon and the expense is filled in for you"
      />
      <Card>
        {isReceiptScanningConfigured() ? (
          <ReceiptScanner
            aliEventId={null}
            defaultDescription="Fancy ALI"
            ingredients={ingredients.map((i) => ({ id: i.id, name: i.name }))}
            canComplete={false}
            redirectTo="/finance"
          />
        ) : (
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            Receipt scanning isn&apos;t switched on for this site yet (it needs an{" "}
            <code>ANTHROPIC_API_KEY</code>). You can still{" "}
            <Link href="/finance/entry">log the amount by hand</Link>.
          </p>
        )}
      </Card>
    </div>
  );
}
