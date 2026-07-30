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

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: superAdminExists } = await supabase.rpc("fn_super_admin_exists");

  if (superAdminExists) {
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
