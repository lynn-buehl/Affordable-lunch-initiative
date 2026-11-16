"use client";

import { useActionState } from "react";
import { changePasswordAction, type ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    changePasswordAction,
    undefined,
  );

  return (
    <Card>
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Change password</h2>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {state?.error ? <FormMessage kind="error">{state.error}</FormMessage> : null}
        {state?.success ? <FormMessage kind="success">{state.success}</FormMessage> : null}
        <TextField
          id="currentPassword"
          name="currentPassword"
          type="password"
          label="Current password"
          required
        />
        <TextField
          id="newPassword"
          name="newPassword"
          type="password"
          label="New password"
          minLength={8}
          required
        />
        <TextField
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm new password"
          minLength={8}
          required
        />
        <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
      </form>
    </Card>
  );
}
