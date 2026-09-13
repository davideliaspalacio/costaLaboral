import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rutas que exigen sesión iniciada. Las legales (/terminos, /privacidad,
 * /datos-personales) son públicas a propósito: un titular sin cuenta
 * también puede ejercer sus derechos.
 */
const RUTAS_PROTEGIDAS = [
  "/perfil",
  "/mis-vacantes",
  "/empresa",
  "/admin",
  "/cuenta",
  "/hoja-de-vida",
  "/linkedin",
  "/pagos",
];

/**
 * Refresca la sesión de Supabase en cada request y protege rutas privadas.
 * Patrón oficial @supabase/ssr para Next.js.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const necesitaAuth = RUTAS_PROTEGIDAS.some((r) => path === r || path.startsWith(r + "/"));

  if (!user && necesitaAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
