"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function BotonSimular({ variante, children }: { variante: "success" | "danger"; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variante} size="lg" block disabled={pending} aria-busy={pending}>
      {pending ? "Enviando evento…" : children}
    </Button>
  );
}
