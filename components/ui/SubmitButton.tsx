"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import type { ButtonHTMLAttributes } from "react";

export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}
