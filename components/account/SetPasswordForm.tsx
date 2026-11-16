"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function SetPasswordForm({
  token,
  action,
  submitLabel,
  pendingLabel,
}: {
  token: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <Card>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="token" value={token} />
        {state?.error ? <FormMessage kind="error">{state.error}</FormMessage> : null}
        <TextField
          id="password"
          name="password"
          type="password"
          label="New password"
          minLength={8}
          required
          autoFocus
        />
        <TextField
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm password"
          minLength={8}
          required
        />
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </form>
    </Card>
  );
}
