"use client";

import { useActionState } from "react";
import { redefinirSenha, type AuthActionState } from "@/lib/actions/auth";
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

const initialState: AuthActionState = { error: null };

export default function RedefinirSenhaPage() {
  const [state, formAction, isPending] = useActionState(redefinirSenha, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar senha nova</CardTitle>
        <CardDescription>
          Mínimo de 8 caracteres, com pelo menos uma letra maiúscula e um número.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha nova</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
            />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvando..." : "Salvar e entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
