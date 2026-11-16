"use client";

import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addIngredientAction } from "@/lib/ali/actions";
import type { ActionState } from "@/lib/auth/actions";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function AddIngredientForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await addIngredientAction(prev, formData);
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
      <div style={{ flex: 1, minWidth: 160 }}>
        <TextField id="ingredient-name" name="name" label="Ingredient" placeholder="Wraps" required />
      </div>
      <div style={{ width: 140 }}>
        <TextField
          id="ingredient-package-size"
          name="packageSize"
          type="number"
          min={1}
          label="Per package"
          defaultValue={1}
          required
        />
      </div>
      <SubmitButton pendingLabel="Adding…">
        <Plus size={16} /> Add
      </SubmitButton>
      {state?.error ? (
        <div style={{ width: "100%" }}>
          <FormMessage kind="error">{state.error}</FormMessage>
        </div>
      ) : null}
    </form>
  );
}
