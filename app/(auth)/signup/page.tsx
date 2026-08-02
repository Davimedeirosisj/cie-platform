import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "@/components/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * This gate has to be decided per request, never at build time.
 *
 * Without it Next.js prerendered /signup as a static page, so
 * fn_super_admin_exists() ran once during `npm run build` and the answer was
 * baked into HTML. In production the build could not reach Supabase, the RPC
 * returned nothing, `superAdminExists` came out falsy, and the *open* signup
 * form was served to everyone -- long after the super_admin existed.
 *
 * The signUp action re-checks, so no account could actually be created, but a
 * security gate must not be frozen at build time in either direction.
 */
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: superAdminExists, error } = await supabase.rpc("fn_super_admin_exists");

  // Fail closed. If the check itself fails we cannot prove signup is still
  // open, and guessing "open" is the one wrong answer that matters.
  if (superAdminExists || error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cadastro fechado</CardTitle>
          <CardDescription>
            O Super Administrador já foi criado. Novos acessos precisam ser concedidos por um
            administrador em Configurações › Usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4">
              Voltar para o login
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>
          Use o email autorizado da campanha para criar o acesso Super Administrador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
