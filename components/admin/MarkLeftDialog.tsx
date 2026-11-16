"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markLeftAction, settleToZeroAction } from "@/lib/finance/actions";
import { formatCents } from "@/lib/money";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogActions,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export function MarkLeftDialog({
  userId,
  userName,
  computedBalanceCents,
}: {
  userId: string;
  userName: string;
  computedBalanceCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [settle, setSettle] = useState(true);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      if (settle && computedBalanceCents !== 0) {
        await settleToZeroAction(userId);
      }
      await markLeftAction(userId);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="danger" size="sm">
          Mark as left
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Mark ${userName} as left?`}
        description="They'll no longer appear in the active balance table."
      >
        {computedBalanceCents !== 0 ? (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              marginBottom: 20,
            }}
          >
            <input
              type="checkbox"
              checked={settle}
              onChange={(e) => setSettle(e.target.checked)}
            />
            Also settle their balance to zero with a{" "}
            {formatCents(-computedBalanceCents)} adjustment
          </label>
        ) : null}
        <DialogActions>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? "Working…" : "Confirm"}
          </Button>
        </DialogActions>
      </DialogContent>
    </DialogRoot>
  );
}
