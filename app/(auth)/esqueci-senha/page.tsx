"use client";

import { useActionState } from "react";
import Link from "next/link";
import { pedirResetSenha, type ResetActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: ResetActionState = { error: null, enviado: false };

export default function EsqueciSenhaPage() {
  const [state, formAction, isPending] = useActionState(pedirResetSenha, initialState);

  if (state.enviado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifique seu email</CardTitle>
          <CardDescription>
            Se este email estiver cadastrado, enviamos um link para criar uma senha nova. O link
            vale por pouco tempo e só pode ser usado uma vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Não chegou? Confira a caixa de spam antes de pedir outro.
          </p>
          <p className="mt-4 text-center text-sm text-muted-foreground">
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
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Informe o email da sua conta e enviaremos um link para criar uma senha nova.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Lembrou a senha?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
