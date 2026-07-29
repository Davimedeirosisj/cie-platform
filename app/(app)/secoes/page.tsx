import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateSecaoDialog } from "@/components/territory/create-secao-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SecoesPage() {
  const supabase = await createClient();
  const [{ data: secoes }, { data: zonas }] = await Promise.all([
    supabase
      .from("secoes")
      .select("id, numero_secao, local_votacao, zonas(numero_zona, bairros(nome, municipios(nome)))")
      .order("numero_secao"),
    supabase.from("zonas").select("id, numero_zona, bairros(nome, municipios(nome))").order("numero_zona"),
  ]);

  const zonaOptions = (zonas ?? []).map((z) => {
    const bairro = z.bairros as unknown as { nome: string; municipios: { nome: string } | null } | null;
    return {
      id: z.id,
      label: `Zona ${z.numero_zona} — ${bairro?.nome ?? ""} (${bairro?.municipios?.nome ?? ""})`,
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Seções Eleitorais</CardTitle>
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
              const zona = s.zonas as unknown as {
                numero_zona: number;
                bairros: { nome: string; municipios: { nome: string } | null } | null;
              } | null;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/secoes/${s.id}`} className="font-medium underline-offset-4 hover:underline">
                      Seção {s.numero_secao}
                    </Link>
                  </TableCell>
                  <TableCell>{zona ? `Zona ${zona.numero_zona}` : "—"}</TableCell>
                  <TableCell>{zona?.bairros?.nome ?? "—"}</TableCell>
                  <TableCell>{zona?.bairros?.municipios?.nome ?? "—"}</TableCell>
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
