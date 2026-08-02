import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteZona } from "@/lib/actions/territorio";
import { MetaEditor } from "@/components/territory/meta-editor";
import { CreateSecaoDialog } from "@/components/territory/create-secao-dialog";
import { DeleteButton } from "@/components/territory/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ZonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: zona } = await supabase
    .from("zonas")
    .select("id, numero_zona")
    .eq("id", id)
    .single();

  if (!zona) notFound();

  const { data: secoes } = await supabase
    .from("secoes")
    .select("id, numero_secao, local_votacao, bairros(nome, municipios(nome))")
    .eq("zona_id", id)
    .order("numero_secao");

  type SecaoRow = {
    bairros: { nome: string; municipios: { nome: string } | null } | null;
  };

  // A zona has no single parent (0024): both the municípios it serves and the
  // bairros it covers are derived from its seções.
  const municipiosAtendidos = [
    ...new Set(
      (secoes ?? []).map((s) => (s as unknown as SecaoRow).bairros?.municipios?.nome).filter(Boolean),
    ),
  ].sort() as string[];
  const bairrosCobertos = [
    ...new Set((secoes ?? []).map((s) => (s as unknown as SecaoRow).bairros?.nome).filter(Boolean)),
  ] as string[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zona {zona.numero_zona}</h1>
          <p className="text-sm text-muted-foreground">
            {municipiosAtendidos.length > 0
              ? municipiosAtendidos.join(", ")
              : "Nenhum município atendido ainda"}
            {bairrosCobertos.length > 0 && ` — abrange ${bairrosCobertos.length} bairros`}
          </p>
        </div>
        <DeleteButton action={deleteZona.bind(null, id)} label="Excluir Zona" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meta 2026</CardTitle>
        </CardHeader>
        <CardContent>
          <MetaEditor nivel="zona" targetId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Seções Eleitorais</CardTitle>
          <CreateSecaoDialog zonaId={id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seção</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Local de Votação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(secoes ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/secoes/${s.id}`} className="font-medium underline-offset-4 hover:underline">
                      Seção {s.numero_secao}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {(s.bairros as unknown as { nome: string } | null)?.nome ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.local_votacao ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(secoes ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma seção cadastrada ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
