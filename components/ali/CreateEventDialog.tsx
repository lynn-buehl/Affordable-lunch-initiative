"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createEventAction } from "@/lib/ali/actions";
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

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    createEventAction,
    undefined,
  );

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} /> New ALI
        </Button>
      </DialogTrigger>
      <DialogContent title="Start a new ALI" description="You'll be the organizer.">
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {state?.error ? <FormMessage kind="error">{state.error}</FormMessage> : null}
          <TextField id="event-name" name="name" label="Name" placeholder="Fancy ALI" required autoFocus />
          <TextField id="event-type" name="type" label="Type" placeholder="Fancy ALI" required />
          <DialogActions>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Creating…">Create</SubmitButton>
          </DialogActions>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
