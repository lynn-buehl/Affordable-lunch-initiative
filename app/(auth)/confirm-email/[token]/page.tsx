import Link from "next/link";
import { consumeAuthToken, updateEmail } from "@/lib/db/queries/users";
import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/FormMessage";

export default async function ConfirmEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenRow = await consumeAuthToken(token, "email_change");

  if (!tokenRow || !tokenRow.newEmail) {
    return (
      <Card>
        <FormMessage kind="error">
          This confirmation link is invalid or expired.
        </FormMessage>
      </Card>
    );
  }

  await updateEmail(tokenRow.userId, tokenRow.newEmail);

  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FormMessage kind="success">
          Email address updated to {tokenRow.newEmail}. Please log in again.
        </FormMessage>
        <Link href="/login">Go to login</Link>
      </div>
    </Card>
  );
}
