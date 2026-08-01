import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteBairro } from "@/lib/actions/territorio";
import { MetaEditor } from "@/components/territory/meta-editor";
import { ObservacoesEditor } from "@/components/territory/observacoes-editor";
import { EditBairroDialog } from "@/components/territory/edit-bairro-dialog";
import { DeleteButton } from "@/components/territory/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function BairroDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bairro } = await supabase
    .from("bairros")
    .select("id, nome, observacoes, latitude, longitude, municipios(nome)")
    .eq("id", id)
    .single();

  if (!bairro) notFound();

  // Zonas are no longer children of a bairro (they span several), so list the
  // bairro's own seções and show which zona each one belongs to.
  const { data: secoes } = await supabase
    .from("secoes")
    .select("id, numero_secao, local_votacao, zonas(numero_zona)")
    .eq("bairro_id", id)
    .order("numero_secao");

  const municipioNome = (bairro.municipios as unknown as { nome: string } | null)?.nome ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{bairro.nome}</h1>
          <p className="text-sm text-muted-foreground">{municipioNome}</p>
        </div>
        <div className="flex gap-2">
          <EditBairroDialog
            id={id}
            nome={bairro.nome}
            observacoes={bairro.observacoes}
            latitude={bairro.latitude}
            longitude={bairro.longitude}
          />
          <DeleteButton action={deleteBairro.bind(null, id)} label="Excluir Bairro" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meta 2026</CardTitle>
          </CardHeader>
          <CardContent>
            <MetaEditor nivel="bairro" targetId={id} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <ObservacoesEditor tabela="bairros" id={id} observacoesAtuais={bairro.observacoes} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seções Eleitorais</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seção</TableHead>
                <TableHead>Zona</TableHead>
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
                    Zona {(s.zonas as unknown as { numero_zona: number } | null)?.numero_zona ?? "—"}
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
