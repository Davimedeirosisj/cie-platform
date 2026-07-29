import { createClient } from "@/lib/supabase/server";
import { CreateCampanhaDialog } from "@/components/campanhas/create-campanha-dialog";
import { CampanhaStatusSelect } from "@/components/campanhas/campanha-status-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function CampanhasPage() {
  const supabase = await createClient();
  const { data: campanhas } = await supabase
    .from("campanhas")
    .select("id, nome, cargo, ano, status, is_campanha_meta")
    .order("ano", { ascending: false });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Campanhas</CardTitle>
        <CreateCampanhaDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Meta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(campanhas ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.cargo}</TableCell>
                <TableCell>{c.ano}</TableCell>
                <TableCell>
                  <CampanhaStatusSelect id={c.id} status={c.status} />
                </TableCell>
                <TableCell>{c.is_campanha_meta && <Badge variant="secondary">Meta</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
