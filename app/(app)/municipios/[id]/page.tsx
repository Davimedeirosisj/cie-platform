import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteMunicipio } from "@/lib/actions/territorio";
import { MetaEditor } from "@/components/territory/meta-editor";
import { ObservacoesEditor } from "@/components/territory/observacoes-editor";
import { CreateBairroDialog } from "@/components/territory/create-bairro-dialog";
import { EditMunicipioDialog } from "@/components/territory/edit-municipio-dialog";
import { DeleteButton } from "@/components/territory/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function MunicipioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: municipio } = await supabase
    .from("municipios")
    .select("id, nome, observacoes, latitude, longitude")
    .eq("id", id)
    .single();

  if (!municipio) notFound();

  const { data: bairros } = await supabase
    .from("bairros")
    .select("id, nome")
    .eq("municipio_id", id)
    .order("nome");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{municipio.nome}</h1>
        <div className="flex gap-2">
          <EditMunicipioDialog
            id={id}
            nome={municipio.nome}
            observacoes={municipio.observacoes}
            latitude={municipio.latitude}
            longitude={municipio.longitude}
          />
          <DeleteButton action={deleteMunicipio.bind(null, id)} label="Excluir Município" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meta da campanha</CardTitle>
          </CardHeader>
          <CardContent>
            <MetaEditor nivel="municipio" targetId={id} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <ObservacoesEditor
              tabela="municipios"
              id={id}
              observacoesAtuais={municipio.observacoes}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bairros</CardTitle>
          <CreateBairroDialog municipioId={id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bairros ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link href={`/bairros/${b.id}`} className="font-medium underline-offset-4 hover:underline">
                      {b.nome}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {(bairros ?? []).length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground">
                    Nenhum bairro cadastrado ainda.
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
