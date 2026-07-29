"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type ResultadoBusca = {
  nivel: "municipio" | "bairro" | "zona" | "secao";
  id: string;
  titulo: string;
  subtitulo: string | null;
};

const NIVEL_LABEL: Record<ResultadoBusca["nivel"], string> = {
  municipio: "Municípios",
  bairro: "Bairros",
  zona: "Zonas",
  secao: "Seções",
};

const NIVEL_ROTA: Record<ResultadoBusca["nivel"], string> = {
  municipio: "/municipios",
  bairro: "/bairros",
  zona: "/zonas",
  secao: "/secoes",
};

export default function BuscaPage() {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const termoLimpo = termo.trim();
    const timeout = setTimeout(async () => {
      if (termoLimpo.length < 2) {
        setResultados([]);
        return;
      }
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.rpc("fn_busca_global", { p_termo: termoLimpo });
      setResultados((data ?? []) as ResultadoBusca[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [termo]);

  const grupos = (["municipio", "bairro", "zona", "secao"] as const).map((nivel) => ({
    nivel,
    itens: resultados.filter((r) => r.nivel === nivel),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pesquisa Global</CardTitle>
        <CardDescription>Busque por município, bairro, zona ou seção.</CardDescription>
      </CardHeader>
      <CardContent>
        <Command shouldFilter={false} className="rounded-lg border">
          <CommandInput
            placeholder="Digite ao menos 2 caracteres..."
            value={termo}
            onValueChange={setTermo}
          />
          <CommandList>
            {!loading && termo.trim().length >= 2 && resultados.length === 0 && (
              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            )}
            {grupos.map(
              ({ nivel, itens }) =>
                itens.length > 0 && (
                  <CommandGroup key={nivel} heading={NIVEL_LABEL[nivel]}>
                    {itens.map((item) => (
                      <CommandItem
                        key={`${item.nivel}-${item.id}`}
                        value={`${item.nivel}-${item.id}`}
                        onSelect={() => router.push(`${NIVEL_ROTA[item.nivel]}/${item.id}`)}
                      >
                        <span>{item.titulo}</span>
                        {item.subtitulo && (
                          <span className="ml-2 text-xs text-muted-foreground">{item.subtitulo}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ),
            )}
          </CommandList>
        </Command>
      </CardContent>
    </Card>
  );
}
