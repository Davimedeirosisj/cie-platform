import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteSecao } from "@/lib/actions/territorio";
import { MetaEditor } from "@/components/territory/meta-editor";
import { EditSecaoLocalForm } from "@/components/territory/edit-secao-local-form";
import { DeleteButton } from "@/components/territory/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SecaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: secao } = await supabase
    .from("secoes")
    .select(
      "id, numero_secao, local_votacao, endereco_local, bairros(nome, municipios(nome)), zonas(numero_zona)",
    )
    .eq("id", id)
    .single();

  if (!secao) notFound();

  // The município comes from the bairro: a zona spans several municípios
  // (0024) and so cannot identify this seção's own.
  const zona = secao.zonas as unknown as { numero_zona: number } | null;
  const bairro = secao.bairros as unknown as {
    nome: string;
    municipios: { nome: string } | null;
  } | null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Seção {secao.numero_secao}</h1>
          <p className="text-sm text-muted-foreground">
            Zona {zona?.numero_zona} — {bairro?.nome} — {bairro?.municipios?.nome}
          </p>
        </div>
        <DeleteButton action={deleteSecao.bind(null, id)} label="Excluir Seção" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meta da campanha</CardTitle>
          </CardHeader>
          <CardContent>
            <MetaEditor nivel="secao" targetId={id} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Local de Votação</CardTitle>
          </CardHeader>
          <CardContent>
            <EditSecaoLocalForm
              id={id}
              localVotacaoAtual={secao.local_votacao}
              enderecoAtual={secao.endereco_local}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
