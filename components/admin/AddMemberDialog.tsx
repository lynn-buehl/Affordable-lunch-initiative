"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { addMemberAction } from "@/lib/finance/actions";
import type { ActionState } from "@/lib/auth/actions";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogActions,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { TEAM_ROSTER } from "@/lib/team-roster";

export function AddMemberDialog({ existingNames = [] }: { existingNames?: string[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  // Team-page people who don't have an account yet, offered as suggestions.
  const taken = new Set(existingNames.map((n) => n.toLowerCase()));
  const suggestions = TEAM_ROSTER.filter((p) => !taken.has(p.name.toLowerCase()));
  const router = useRouter();
  const [state, formAction] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await addMemberAction(prev, formData);
      if (result?.success) router.refresh();
      return result;
    },
    undefined,
  );

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus size={16} /> Add member
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Add a member"
        description="They'll get an email to set up their account."
      >
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {state?.error ? <FormMessage kind="error">{state.error}</FormMessage> : null}
          {state?.success ? <FormMessage kind="success">{state.success}</FormMessage> : null}
          <TextField
            id="name"
            name="name"
            label="Name"
            required
            autoFocus
            list="team-roster"
            autoComplete="off"
            onChange={(e) => {
              const match = TEAM_ROSTER.find((p) => p.name === e.target.value);
              if (match) setTitle(match.title);
            }}
          />
          <datalist id="team-roster">
            {suggestions.map((person) => (
              <option key={person.name} value={person.name}>
                {person.title}
              </option>
            ))}
          </datalist>
          <TextField id="email" name="email" type="email" label="Email" required />
          <TextField
            id="title"
            name="title"
            label="Role in the group (optional)"
            placeholder="PhD Student"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <DialogActions>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Sending…">Send invite</SubmitButton>
          </DialogActions>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
