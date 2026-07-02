import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Buscador GET simple (sin JS): envía el término en el query `name` a la misma
 * ruta. Al buscar se resetea la paginación.
 */
export function SearchBox({
  name = "q",
  defaultValue = "",
  placeholder = "Buscar…",
  action,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  action: string;
}) {
  return (
    <form action={action} method="get" className="flex w-full max-w-md items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="pl-10"
          aria-label={placeholder}
        />
      </div>
      <Button type="submit" variant="outline" size="md">
        Buscar
      </Button>
    </form>
  );
}
