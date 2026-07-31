import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteBatchButton } from "@/components/import/delete-batch-button";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  processando: "Processando",
  validado: "Validado",
  importado: "Importado",
  erro: "Erro",
};

export default async function ImportBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, nome_arquivo, status, total_linhas, linhas_sucesso, linhas_erro, created_at, completed_at, campanhas(nome)")
    .eq("id", batchId)
    .single();

  if (!batch) notFound();

  const { data: erros } = await supabase
    .from("import_row_errors")
    .select("id, linha_numero, erro, dados_originais")
    .eq("import_batch_id", batchId)
    .order("linha_numero")
    .limit(200);

  const campanha = batch.campanhas as unknown as { nome: string } | null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{batch.nome_arquivo}</h1>
          <p className="text-sm text-muted-foreground">
            Gravado em <span className="font-medium">{campanha?.nome}</span>
          </p>
        </div>
        <DeleteBatchButton
          batchId={batch.id}
          nomeArquivo={batch.nome_arquivo}
          campanhaNome={campanha?.nome ?? ""}
          linhasSucesso={batch.linhas_sucesso}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge variant="secondary">{STATUS_LABELS[batch.status] ?? batch.status}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Total de linhas</p>
            <p className="font-medium">{batch.total_linhas}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Sucesso</p>
            <p className="font-medium">{batch.linhas_sucesso}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Erros</p>
            <p className="font-medium">{batch.linhas_erro}</p>
          </div>
        </CardContent>
      </Card>

      {(erros ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linhas com erro</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linha</TableHead>
                  <TableHead>Erro</TableHead>
                  <TableHead>Dados originais</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(erros ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.linha_numero}</TableCell>
                    <TableCell className="text-destructive">{e.erro}</TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">
                      {JSON.stringify(e.dados_originais)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
