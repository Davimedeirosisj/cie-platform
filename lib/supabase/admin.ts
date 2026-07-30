import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for admin-only operations (inviting users, etc).
// SUPABASE_SERVICE_ROLE_KEY is a server-only secret -- never prefix it with
// NEXT_PUBLIC_ and never import this file from a Client Component.
export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione-a nas variáveis de ambiente (Supabase → Project Settings → API → service_role key).",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
