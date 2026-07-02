import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role. SOLO servidor. Se salta RLS, por eso se usa
 * exclusivamente en Server Actions/Components donde ya validamos la
 * autorización en código (listados públicos, panel de empresa, admin,
 * disparo de notificaciones, matching).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
