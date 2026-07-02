"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";
import { cambiarRolStaff } from "@/lib/actions/admin";
import { ROL_LABEL, type StaffRol } from "@/lib/roles-shared";

const ROLES: StaffRol[] = ["moderador", "admin", "super_admin"];

/** Selector para cambiar el rol de un miembro del staff (solo super_admin). */
export function StaffRolSelect({
  userId,
  rol,
  esYo,
}: {
  userId: string;
  rol: StaffRol;
  esYo: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [valor, setValor] = useState<StaffRol>(rol);

  function cambiar(nuevo: StaffRol) {
    const anterior = valor;
    setValor(nuevo);
    setError(null);
    startTransition(async () => {
      const res = await cambiarRolStaff(userId, nuevo);
      if ("error" in res) {
        setValor(anterior);
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (esYo) {
    return <span className="text-xs text-muted">Tú · {ROL_LABEL[rol]}</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Select
        aria-label="Rol del miembro"
        value={valor}
        disabled={pending}
        onChange={(e) => cambiar(e.target.value as StaffRol)}
        className="h-9 py-0 text-sm"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROL_LABEL[r]}
          </option>
        ))}
      </Select>
      {error && <span className="text-xs font-medium text-danger-500">{error}</span>}
    </div>
  );
}
