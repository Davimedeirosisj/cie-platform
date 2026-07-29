import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateBairroDialog } from "@/components/territory/create-bairro-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function BairrosPage() {
  const supabase = await createClient();
  const [{ data: bairros }, { data: municipios }] = await Promise.all([
    supabase
      .from("bairros")
      .select("id, nome, observacoes, municipios(nome)")
      .order("nome"),
    supabase.from("municipios").select("id, nome").order("nome"),
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bairros</CardTitle>
        <CreateBairroDialog municipios={municipios ?? []} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Observações</TableHead>
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
                <TableCell>{(b.municipios as unknown as { nome: string } | null)?.nome ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{b.observacoes ?? "—"}</TableCell>
              </TableRow>
            ))}
            {(bairros ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhum bairro cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
