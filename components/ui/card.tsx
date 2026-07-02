import * as React from "react";
import { cn } from "@/lib/utils";

/** Tarjeta con borde grueso de tinta. `pop` añade la sombra dura tipo sticker. */
export function Card({
  className,
  pop,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { pop?: boolean }) {
  return <div className={cn("card", pop && "shadow-[var(--shadow-sticker)]", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}
