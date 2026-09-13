import * as React from "react";

/** Cabecera estándar de las páginas del panel: kicker + título + descripción + acciones. */
export function PageHeader({
  kicker,
  titulo,
  children,
  acciones,
}: {
  kicker: string;
  titulo: string;
  children?: React.ReactNode;
  acciones?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <span className="kicker">{kicker}</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{titulo}</h1>
        {children && <div className="mt-1 text-sm text-ink-soft">{children}</div>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  );
}

/** Formulario GET de rango de fechas (sin JS). Conserva otros parámetros como campos ocultos. */
export function RangoFechasForm({
  action,
  desde,
  hasta,
  extra = {},
}: {
  action: string;
  desde: string;
  hasta: string;
  extra?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-end gap-3">
      {Object.entries(extra).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className="flex flex-col text-sm font-bold text-ink">
        Desde
        <input type="date" name="desde" defaultValue={desde} className="input-base mt-1 h-10 py-0 text-sm" />
      </label>
      <label className="flex flex-col text-sm font-bold text-ink">
        Hasta
        <input type="date" name="hasta" defaultValue={hasta} className="input-base mt-1 h-10 py-0 text-sm" />
      </label>
      <button
        type="submit"
        className="h-10 rounded-xl border-2 border-ink bg-ink px-4 text-sm font-bold text-canvas shadow-[var(--shadow-sticker)]"
      >
        Aplicar
      </button>
    </form>
  );
}

/** Tile de estadística compacto. */
export function StatTile({
  label,
  valor,
  detalle,
  tono = "surface",
}: {
  label: string;
  valor: string;
  detalle?: string;
  tono?: "surface" | "sol" | "brand" | "danger";
}) {
  const fondo = { surface: "bg-surface", sol: "bg-sol-100", brand: "bg-brand-50", danger: "bg-danger-50" }[tono];
  return (
    <div className={`card p-4 ${fondo}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink tabular-nums">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-ink-soft">{detalle}</p>}
    </div>
  );
}
