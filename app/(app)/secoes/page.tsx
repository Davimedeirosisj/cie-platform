import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateSecaoDialog } from "@/components/territory/create-secao-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SecoesPage() {
  const supabase = await createClient();
  // A seção's município comes from its bairro: the zona is a statewide
  // jurisdiction that can serve several municípios (0024), so it can no
  // longer answer "which município is this seção in?".
  // PostgREST caps a response at 1.000 rows, so with ~9.000 seções this page
  // was silently showing a slice as if it were everything. The count is
  // fetched alongside so the limit can be stated instead of hidden.
  const LIMITE = 500;
  const [{ data: secoes, count }, { data: zonas }] = await Promise.all([
    supabase
      .from("secoes")
      .select(
        "id, numero_secao, local_votacao, bairros(nome, municipios(nome)), zonas(numero_zona)",
        { count: "exact" },
      )
      .order("numero_secao")
      .limit(LIMITE),
    supabase.from("zonas").select("id, numero_zona").order("numero_zona"),
  ]);

  const total = count ?? 0;
  const truncado = total > (secoes?.length ?? 0);

  const zonaOptions = (zonas ?? []).map((z) => ({
    id: z.id,
    label: `Zona ${z.numero_zona}`,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Seções Eleitorais</CardTitle>
          {truncado && (
            <p className="mt-1 text-sm text-muted-foreground">
              Mostrando {(secoes?.length ?? 0).toLocaleString("pt-BR")} de{" "}
              {total.toLocaleString("pt-BR")}. Use a Pesquisa Global ou os Relatórios para
              localizar uma seção específica.
            </p>
          )}
        </div>
        <CreateSecaoDialog zonas={zonaOptions} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seção</TableHead>
              <TableHead>Zona</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Local de Votação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(secoes ?? []).map((s) => {
              const zona = s.zonas as unknown as { numero_zona: number } | null;
              const bairro = s.bairros as unknown as {
                nome: string;
                municipios: { nome: string } | null;
              } | null;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/secoes/${s.id}`} className="font-medium underline-offset-4 hover:underline">
                      Seção {s.numero_secao}
                    </Link>
                  </TableCell>
                  <TableCell>{zona ? `Zona ${zona.numero_zona}` : "—"}</TableCell>
                  <TableCell>{bairro?.nome ?? "—"}</TableCell>
                  <TableCell>{bairro?.municipios?.nome ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.local_votacao ?? "—"}</TableCell>
                </TableRow>
              );
            })}
            {(secoes ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma seção cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
