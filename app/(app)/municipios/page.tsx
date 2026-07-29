import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateMunicipioDialog } from "@/components/territory/create-municipio-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function MunicipiosPage() {
  const supabase = await createClient();
  const { data: municipios } = await supabase
    .from("municipios")
    .select("id, nome, observacoes")
    .order("nome");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Municípios</CardTitle>
        <CreateMunicipioDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(municipios ?? []).map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Link href={`/municipios/${m.id}`} className="font-medium underline-offset-4 hover:underline">
                    {m.nome}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.observacoes ?? "—"}</TableCell>
              </TableRow>
            ))}
            {(municipios ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Nenhum município cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
