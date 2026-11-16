"use client";

import { useActionState } from "react";
import { adjustmentAction } from "@/lib/finance/actions";
import type { ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/Card";
import { TextField, SelectField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function AdjustmentForm({
  members,
}: {
  members: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    adjustmentAction,
    undefined,
  );

  return (
    <Card>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {state?.error ? <FormMessage kind="error">{state.error}</FormMessage> : null}
        {state?.success ? <FormMessage kind="success">{state.success}</FormMessage> : null}
        <SelectField id="userId" name="userId" label="Member" required defaultValue="">
          <option value="" disabled>
            Choose a member
          </option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </SelectField>
        <TextField
          id="amount"
          name="amount"
          label="Amount (use - for a debit)"
          placeholder="-4,71"
          inputMode="decimal"
          required
        />
        <TextField id="reason" name="reason" label="Reason" required />
        <SubmitButton pendingLabel="Saving…">Record adjustment</SubmitButton>
      </form>
    </Card>
  );
}
