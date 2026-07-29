import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "@/components/import/import-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  processando: "Processando",
  validado: "Validado",
  importado: "Importado",
  erro: "Erro",
};

export default async function ImportacaoPage() {
  const supabase = await createClient();
  const { data: batches } = await supabase
    .from("import_batches")
    .select("id, nome_arquivo, status, total_linhas, linhas_sucesso, linhas_erro, created_at, campanhas(nome)")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col gap-4">
      <ImportWizard />

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Importações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linhas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(batches ?? []).map((b) => {
                const campanha = b.campanhas as unknown as { nome: string } | null;
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link href={`/importacao/${b.id}`} className="font-medium underline-offset-4 hover:underline">
                        {b.nome_arquivo}
                      </Link>
                    </TableCell>
                    <TableCell>{campanha?.nome ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{STATUS_LABELS[b.status] ?? b.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.linhas_sucesso}/{b.total_linhas} ok
                      {b.linhas_erro > 0 && `, ${b.linhas_erro} com erro`}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(batches ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma importação realizada ainda.
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
