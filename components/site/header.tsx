import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { buttonVariants } from "@/components/ui/button";
import { UserMenu } from "@/components/site/user-menu";
import { getUsuario, getCandidato, getEmpresa, esAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function Header() {
  const sesion = await getUsuario();
  let nombre = "";
  let tipo: "candidato" | "empresa" | "admin" = "candidato";

  if (sesion) {
    if (esAdmin(sesion.email)) tipo = "admin";
    else tipo = sesion.tipo === "empresa" ? "empresa" : "candidato";
    if (tipo === "empresa") nombre = (await getEmpresa())?.nombre_contacto ?? sesion.email;
    else nombre = (await getCandidato())?.nombre ?? sesion.email;
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-canvas">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/ofertas" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Ofertas
          </Link>
          {sesion && tipo === "candidato" && (
            <Link href="/hoja-de-vida" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Hoja de vida IA
            </Link>
          )}
          <Link href="/registro-empresa" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Publicar vacante
          </Link>
          <Link href="/planes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Planes
          </Link>
          <Link href="/blog" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Blog
          </Link>
          {tipo === "admin" && (
            <Link href="/admin" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {sesion ? (
            <UserMenu nombre={nombre} tipo={tipo} />
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
              >
                Ingresar
              </Link>
              <Link href="/registro-candidato" className={cn(buttonVariants({ variant: "sol", size: "sm" }))}>
                Buscar camello
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
