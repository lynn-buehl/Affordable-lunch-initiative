"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, UserPlus } from "lucide-react";
import { toggleParticipationAction } from "@/lib/ali/actions";
import { Button } from "@/components/ui/Button";

export function ParticipationToggle({
  eventId,
  optedIn,
}: {
  eventId: string;
  optedIn: boolean | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(next: boolean) {
    startTransition(async () => {
      await toggleParticipationAction(eventId, next);
      router.refresh();
    });
  }

  if (optedIn === true) {
    return (
      <Button variant="secondary" size="sm" onClick={() => set(false)} disabled={pending}>
        <Check size={16} /> You&apos;re in — opt out
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={() => set(true)} disabled={pending}>
      <UserPlus size={16} /> {optedIn === false ? "Opt back in" : "Opt in"}
    </Button>
  );
}
