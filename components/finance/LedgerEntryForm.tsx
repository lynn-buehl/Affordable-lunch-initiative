"use client";

import { useActionState } from "react";
import { ledgerEntryAction } from "@/lib/finance/actions";
import type { ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/Card";
import { TextField, SelectField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

const today = () => new Date().toISOString().slice(0, 10);

export function LedgerEntryForm({
  members,
  aliEventId,
  defaultDescription,
}: {
  members: { id: string; name: string }[] | null;
  aliEventId?: string;
  defaultDescription?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    ledgerEntryAction,
    undefined,
  );

  return (
    <Card>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {aliEventId ? <input type="hidden" name="aliEventId" value={aliEventId} /> : null}
        {state?.error ? <FormMessage kind="error">{state.error}</FormMessage> : null}
        <SelectField id="entryType" name="entryType" label="Type" defaultValue="expense">
          <option value="expense">Expense (I spent money)</option>
          <option value="contribution">Contribution (I paid into the kitty)</option>
        </SelectField>
        <TextField
          id="amount"
          name="amount"
          label="Amount"
          placeholder="12,50"
          inputMode="decimal"
          required
        />
        <TextField
          id="description"
          name="description"
          label="Description"
          placeholder="Fancy ALI"
          defaultValue={defaultDescription}
          required
        />
        <TextField
          id="entryDate"
          name="entryDate"
          type="date"
          label="Date"
          defaultValue={today()}
          required
        />
        {members ? (
          <SelectField
            id="onBehalfOfUserId"
            name="onBehalfOfUserId"
            label="On behalf of"
            defaultValue=""
          >
            <option value="">Myself</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </SelectField>
        ) : null}
        <SubmitButton pendingLabel="Saving…">Save entry</SubmitButton>
      </form>
    </Card>
  );
}
