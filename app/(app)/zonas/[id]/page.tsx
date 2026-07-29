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
    .select("id, numero_zona, bairros(nome, municipios(nome))")
    .eq("id", id)
    .single();

  if (!zona) notFound();

  const { data: secoes } = await supabase
    .from("secoes")
    .select("id, numero_secao, local_votacao")
    .eq("zona_id", id)
    .order("numero_secao");

  const bairro = zona.bairros as unknown as { nome: string; municipios: { nome: string } | null } | null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zona {zona.numero_zona}</h1>
          <p className="text-sm text-muted-foreground">
            {bairro?.nome} — {bairro?.municipios?.nome}
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
                  <TableCell className="text-muted-foreground">{s.local_votacao ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(secoes ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
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
