import * as React from "react";
import { Card } from "@/components/ui/card";

type PanelSectionProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
};

/** Bloque con cabecera + tarjeta, para las secciones del panel interno. */
export function PanelSection({ title, description, icon, action, children }: PanelSectionProps) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              {icon}
            </span>
          )}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
            {description && <p className="text-sm text-ink-soft">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <Card className="overflow-hidden">{children}</Card>
    </section>
  );
}
