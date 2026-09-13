import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { buttonVariants } from "@/components/ui/button";
import { UserMenu } from "@/components/site/user-menu";
import { getUsuario, getCandidato, getEmpresa } from "@/lib/auth";
import { getStaff } from "@/lib/roles";
import { cn } from "@/lib/utils";

const navLink = cn(buttonVariants({ variant: "ghost", size: "sm" }));

export async function Header() {
  const sesion = await getUsuario();
  const tipo: "candidato" | "empresa" = sesion?.tipo === "empresa" ? "empresa" : "candidato";
  let nombre = "";
  let esStaff = false;

  if (sesion) {
    const [perfil, staff] = await Promise.all([
      tipo === "empresa" ? getEmpresa().then((e) => e?.nombre_contacto) : getCandidato().then((c) => c?.nombre),
      getStaff(),
    ]);
    nombre = perfil ?? staff?.nombre ?? sesion.email;
    esStaff = !!staff;
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-canvas">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          <Link href="/ofertas" className={navLink}>
            Ofertas
          </Link>
          {sesion && tipo === "candidato" && (
            <>
              <Link href="/mis-vacantes" className={navLink}>
                Recomendadas
              </Link>
              <Link href="/hoja-de-vida" className={navLink}>
                Hoja de vida
              </Link>
            </>
          )}
          {sesion && tipo === "empresa" ? (
            <Link href="/empresa/panel" className={navLink}>
              Panel
            </Link>
          ) : (
            !sesion && (
              <Link href="/registro-empresa" className={navLink}>
                Para empresas
              </Link>
            )
          )}
          <Link href="/planes" className={navLink}>
            Planes
          </Link>
          {esStaff && (
            <Link href="/admin" className={navLink}>
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {sesion ? (
            <UserMenu nombre={nombre} tipo={tipo} esStaff={esStaff} />
          ) : (
            <>
              <Link href="/ofertas" className={cn(navLink, "md:hidden")}>
                Ofertas
              </Link>
              <Link href="/login" className={cn(navLink, "hidden sm:inline-flex")}>
                Ingresar
              </Link>
              <Link href="/registro-candidato" className={cn(buttonVariants({ variant: "sol", size: "sm" }))}>
                Crear perfil gratis
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
