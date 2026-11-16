"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/finance/actions";
import type { ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function ProfileForm({ currentTitle }: { currentTitle: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateProfileAction,
    undefined,
  );

  return (
    <Card>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ fontSize: 16 }}>Profile</h2>
        {state?.error ? <FormMessage kind="error">{state.error}</FormMessage> : null}
        {state?.success ? <FormMessage kind="success">{state.success}</FormMessage> : null}
        <TextField
          id="profile-title"
          name="title"
          label="Role in the group"
          placeholder="PhD Student"
          defaultValue={currentTitle}
          maxLength={80}
        />
        <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
      </form>
    </Card>
  );
}
