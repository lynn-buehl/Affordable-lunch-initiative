"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, CheckCircle2, XCircle } from "lucide-react";
import {
  startShoppingAction,
  completeEventAction,
  cancelEventAction,
} from "@/lib/ali/actions";
import { Button } from "@/components/ui/Button";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogActions,
} from "@/components/ui/Dialog";

export function OrganizerControls({
  eventId,
  status,
}: {
  eventId: string;
  status: "voting" | "shopping" | "completed" | "cancelled";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [startOpen, setStartOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        setError(null);
        router.refresh();
      } catch {
        setError("Something went wrong. Try again.");
      }
    });
  }

  if (status === "completed" || status === "cancelled") return null;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {status === "voting" ? (
        <DialogRoot open={startOpen} onOpenChange={setStartOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <ShoppingCart size={16} /> Start shopping
            </Button>
          </DialogTrigger>
          <DialogContent
            title="Start shopping?"
            description="Voting closes and the ingredient list locks in as your shopping list. Do this when you're about to head out."
          >
            <DialogActions>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={() => {
                  run(() => startShoppingAction(eventId));
                  setStartOpen(false);
                }}
                disabled={pending}
              >
                {pending ? "Starting…" : "Start shopping"}
              </Button>
            </DialogActions>
          </DialogContent>
        </DialogRoot>
      ) : null}
      {status === "shopping" ? (
        <Button size="sm" onClick={() => run(() => completeEventAction(eventId))} disabled={pending}>
          <CheckCircle2 size={16} /> Mark completed
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="danger"
        onClick={() => run(() => cancelEventAction(eventId))}
        disabled={pending}
      >
        <XCircle size={16} /> Cancel ALI
      </Button>
      {error ? <span style={{ color: "var(--negative)", fontSize: 13 }}>{error}</span> : null}
    </div>
  );
}
