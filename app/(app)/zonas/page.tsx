import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateZonaDialog } from "@/components/territory/create-zona-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ZonasPage() {
  const supabase = await createClient();
  // A zona spans several bairros, so it hangs off the município and the
  // bairros it covers are derived from its seções.
  const [{ data: zonas }, { data: municipios }] = await Promise.all([
    supabase
      .from("zonas")
      .select("id, numero_zona, municipios(nome), secoes(bairros(nome))")
      .order("numero_zona"),
    supabase.from("municipios").select("id, nome").order("nome"),
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Zonas Eleitorais</CardTitle>
        <CreateZonaDialog municipios={municipios ?? []} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zona</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Bairros abrangidos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(zonas ?? []).map((z) => {
              const municipio = z.municipios as unknown as { nome: string } | null;
              const secoes = (z.secoes ?? []) as unknown as { bairros: { nome: string } | null }[];
              const bairrosUnicos = [
                ...new Set(secoes.map((s) => s.bairros?.nome).filter(Boolean)),
              ] as string[];

              return (
                <TableRow key={z.id}>
                  <TableCell>
                    <Link href={`/zonas/${z.id}`} className="font-medium underline-offset-4 hover:underline">
                      Zona {z.numero_zona}
                    </Link>
                  </TableCell>
                  <TableCell>{municipio?.nome ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {bairrosUnicos.length > 0 ? `${bairrosUnicos.length} bairros` : "—"}
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
