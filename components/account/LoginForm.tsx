"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <Card>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {notice ? <FormMessage kind="success">{notice}</FormMessage> : null}
        {state?.error ? <FormMessage kind="error">{state.error}</FormMessage> : null}
        <TextField id="email" name="email" type="email" label="Email" required autoFocus />
        <TextField id="password" name="password" type="password" label="Password" required />
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
        <Link href="/forgot-password" style={{ fontSize: 13, textAlign: "center" }}>
          Forgot your password?
        </Link>
      </form>
    </Card>
  );
}
