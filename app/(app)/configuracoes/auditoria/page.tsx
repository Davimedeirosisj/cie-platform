import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AuditFilters } from "@/components/auditoria/audit-filters";

const ACTION_LABELS: Record<string, string> = {
  insert: "Criação",
  update: "Atualização",
  delete: "Exclusão",
};

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  insert: "default",
  update: "secondary",
  delete: "destructive",
};

const TABLE_LABELS: Record<string, string> = {
  municipios: "Município",
  bairros: "Bairro",
  zonas: "Zona",
  secoes: "Seção",
  votos: "Votos",
  metas: "Meta",
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ tabela?: string; acao?: string }>;
}) {
  const { tabela, acao } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("id, table_name, record_id, action, changed_at, old_data, new_data, profiles(nome)")
    .order("changed_at", { ascending: false })
    .limit(200);

  if (tabela) query = query.eq("table_name", tabela);
  if (acao) query = query.eq("action", acao);

  const { data: logs } = await query;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Auditoria</CardTitle>
        <AuditFilters tabela={tabela} acao={acao} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tabela</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(logs ?? []).map((log) => {
              const usuario = log.profiles as unknown as { nome: string } | null;
              return (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(log.changed_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{TABLE_LABELS[log.table_name] ?? log.table_name}</TableCell>
                  <TableCell>
                    <Badge variant={ACTION_VARIANTS[log.action] ?? "secondary"}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{usuario?.nome ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.record_id.slice(0, 8)}
                  </TableCell>
                </TableRow>
              );
            })}
            {(logs ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum registro de alteração ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
