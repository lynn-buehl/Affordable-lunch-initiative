"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    requestPasswordResetAction,
    undefined,
  );

  return (
    <Card>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
          Enter your email and we&apos;ll send you a reset link.
        </p>
        {state?.success ? <FormMessage kind="success">{state.success}</FormMessage> : null}
        <TextField id="email" name="email" type="email" label="Email" required autoFocus />
        <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
      </form>
    </Card>
  );
}
