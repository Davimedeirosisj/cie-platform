import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteBairro } from "@/lib/actions/territorio";
import { MetaEditor } from "@/components/territory/meta-editor";
import { ObservacoesEditor } from "@/components/territory/observacoes-editor";
import { CreateZonaDialog } from "@/components/territory/create-zona-dialog";
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

  const { data: zonas } = await supabase
    .from("zonas")
    .select("id, numero_zona")
    .eq("bairro_id", id)
    .order("numero_zona");

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Zonas Eleitorais</CardTitle>
          <CreateZonaDialog bairroId={id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zona</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(zonas ?? []).map((z) => (
                <TableRow key={z.id}>
                  <TableCell>
                    <Link href={`/zonas/${z.id}`} className="font-medium underline-offset-4 hover:underline">
                      Zona {z.numero_zona}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {(zonas ?? []).length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground">
                    Nenhuma zona cadastrada ainda.
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
