"use client";

import { useActionState } from "react";
import { changeEmailAction, type ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    changeEmailAction,
    undefined,
  );

  return (
    <Card>
      <h2 style={{ fontSize: 16, marginBottom: 4 }}>Change email</h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>
        Currently {currentEmail}
      </p>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {state?.error ? <FormMessage kind="error">{state.error}</FormMessage> : null}
        {state?.success ? <FormMessage kind="success">{state.success}</FormMessage> : null}
        <TextField id="newEmail" name="newEmail" type="email" label="New email" required />
        <TextField
          id="currentPassword"
          name="currentPassword"
          type="password"
          label="Current password"
          required
        />
        <SubmitButton pendingLabel="Sending…">Send confirmation link</SubmitButton>
      </form>
    </Card>
  );
}
