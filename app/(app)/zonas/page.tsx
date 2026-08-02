import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateZonaDialog } from "@/components/territory/create-zona-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ZonasPage() {
  const supabase = await createClient();
  // A zona is a statewide jurisdiction that can serve several municípios
  // (0024), so both the municípios and the bairros it covers are derived from
  // its seções rather than stored on the zona itself.
  const { data: zonas } = await supabase
    .from("zonas")
    .select("id, numero_zona, secoes(bairros(nome, municipios(nome)))")
    .order("numero_zona");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Zonas Eleitorais</CardTitle>
        <CreateZonaDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zona</TableHead>
              <TableHead>Municípios atendidos</TableHead>
              <TableHead>Bairros abrangidos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(zonas ?? []).map((z) => {
              const secoes = (z.secoes ?? []) as unknown as {
                bairros: { nome: string; municipios: { nome: string } | null } | null;
              }[];
              const municipios = [
                ...new Set(secoes.map((s) => s.bairros?.municipios?.nome).filter(Boolean)),
              ] as string[];
              const bairros = [
                ...new Set(secoes.map((s) => s.bairros?.nome).filter(Boolean)),
              ] as string[];

              return (
                <TableRow key={z.id}>
                  <TableCell>
                    <Link
                      href={`/zonas/${z.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      Zona {z.numero_zona}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {municipios.length === 0
                      ? "—"
                      : municipios.length <= 2
                        ? municipios.sort().join(", ")
                        : `${municipios.length} municípios`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {bairros.length > 0 ? `${bairros.length} bairros` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {(zonas ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhuma zona cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
