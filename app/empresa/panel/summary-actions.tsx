"use client";

/** Envuelve controles dentro de un <summary> evitando que abran/cierren el <details>. */
export function SummaryActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} onClick={(e) => e.preventDefault()}>
      {children}
    </div>
  );
}
