import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas alcançáveis sem sessão.
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/esqueci-senha",
  "/redefinir-senha",
  "/auth/callback",
];

// Dessas, só estas devolvem ao /dashboard quem já está logado.
//
// /redefinir-senha ficou de fora de propósito: dependendo do formato do link, a
// pessoa chega já autenticada pela sessão de recuperação. Se ela fosse tratada
// como as outras, seria mandada ao /dashboard antes de conseguir digitar a
// senha nova -- e quem esqueceu a senha ficaria sem como trocá-la.
const ROTAS_SO_PARA_DESLOGADOS = ["/login", "/signup", "/esqueci-senha"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const isRotaSoParaDeslogados = ROTAS_SO_PARA_DESLOGADOS.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (user && isRotaSoParaDeslogados) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
