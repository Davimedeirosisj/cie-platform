import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Troca o código do link de email por uma sessão.
 *
 * O Supabase não manda a pessoa direto para /redefinir-senha: manda para cá com
 * um `code` de uso único, que precisa ser trocado por uma sessão antes de
 * qualquer página protegida abrir.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // `next` vem da URL, então um link forjado poderia apontar para outro site.
  // Só aceitamos caminhos internos.
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${destino}`);
    }
    console.error("Erro ao trocar código por sessão:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?erro=link_invalido`);
}
