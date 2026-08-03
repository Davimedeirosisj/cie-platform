"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RedefinirSenhaSchema } from "@/lib/validation";
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

/**
 * Roda no navegador de propósito.
 *
 * O Supabase devolve o link de recuperação em dois formatos, e qual deles
 * chega depende de onde o email foi aberto. Um deles vem como fragmento
 * (#access_token=...), que o navegador nunca envia ao servidor -- então uma
 * página de servidor simplesmente não enxerga a sessão e mandaria de volta ao
 * login quem clicou pelo celular. O cliente de navegador lê os dois.
 */
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<"verificando" | "pronto" | "sem-sessao">("verificando");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const supabase = createClient();

    // detectSessionInUrl consome o fragmento de forma assíncrona, então a
    // sessão pode não existir ainda no primeiro instante.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (!cancelado && session) setEstado("pronto");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (cancelado) return;
      setEstado(data.session ? "pronto" : "sem-sessao");
    });

    // getSession() pode nunca resolver: sobrando de uma tentativa anterior um
    // code-verifier no armazenamento, sem código correspondente na URL, o
    // cliente fica esperando um fluxo que não vai se completar. Sem este prazo
    // a tela trava para sempre em "Verificando o link..." -- foi o que
    // aconteceu em produção. Desistir e oferecer um link novo é sempre melhor
    // do que uma espera infinita.
    const prazo = setTimeout(() => {
      if (!cancelado) setEstado((atual) => (atual === "verificando" ? "sem-sessao" : atual));
    }, 4000);

    return () => {
      cancelado = true;
      clearTimeout(prazo);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    // Mesmo schema do cadastro, para as regras de senha viverem num lugar só.
    const validacao = RedefinirSenhaSchema.safeParse({ password: senha });
    if (!validacao.success) {
      setErro(validacao.error.issues[0].message);
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      setErro(`Não foi possível salvar: ${error.message}`);
      return;
    }

    router.push("/dashboard");
  }

  if (estado === "verificando") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verificando o link...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (estado === "sem-sessao") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link expirado ou já utilizado</CardTitle>
          <CardDescription>
            Cada link de recuperação vale por pouco tempo e só funciona uma vez. Peça um novo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/esqueci-senha" className="underline underline-offset-4">
              Pedir novo link
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar senha nova</CardTitle>
        <CardDescription>
          Mínimo de 8 caracteres, com pelo menos uma letra maiúscula e um número.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha nova</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button type="submit" disabled={salvando} className="w-full">
            {salvando ? "Salvando..." : "Salvar e entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
