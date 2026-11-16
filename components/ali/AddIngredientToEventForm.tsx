"use client";

import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addIngredientToEventAction } from "@/lib/ali/actions";
import type { ActionState } from "@/lib/auth/actions";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function AddIngredientToEventForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const boundAction = addIngredientToEventAction.bind(null, eventId);
  const [state, formAction] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await boundAction(prev, formData);
      if (result?.success) {
        formRef.current?.reset();
        router.refresh();
      }
      return result;
    },
    undefined,
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}
    >
      <div style={{ flex: 1, minWidth: 140 }}>
        <TextField id="new-ingredient-name" name="name" label="New ingredient" placeholder="Hummus" required />
      </div>
      <div style={{ width: 110 }}>
        <TextField
          id="new-ingredient-package-size"
          name="packageSize"
          type="number"
          min={1}
          label="Per package"
          defaultValue={1}
          required
        />
      </div>
      <div style={{ width: 90 }}>
        <TextField
          id="new-ingredient-quantity"
          name="quantity"
          type="number"
          min={1}
          label="I want"
          defaultValue={1}
          required
        />
      </div>
      <SubmitButton pendingLabel="Adding…">
        <Plus size={16} /> Add & vote
      </SubmitButton>
      {state?.error ? (
        <div style={{ width: "100%" }}>
          <FormMessage kind="error">{state.error}</FormMessage>
        </div>
      ) : null}
    </form>
  );
}
