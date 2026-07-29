import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateZonaDialog } from "@/components/territory/create-zona-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ZonasPage() {
  const supabase = await createClient();
  const [{ data: zonas }, { data: bairros }] = await Promise.all([
    supabase
      .from("zonas")
      .select("id, numero_zona, bairros(nome, municipios(nome))")
      .order("numero_zona"),
    supabase.from("bairros").select("id, nome, municipios(nome)").order("nome"),
  ]);

  const bairroOptions = (bairros ?? []).map((b) => ({
    id: b.id,
    nome: b.nome,
    municipioNome: (b.municipios as unknown as { nome: string } | null)?.nome ?? "",
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Zonas Eleitorais</CardTitle>
        <CreateZonaDialog bairros={bairroOptions} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zona</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Município</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(zonas ?? []).map((z) => {
              const bairro = z.bairros as unknown as { nome: string; municipios: { nome: string } | null } | null;
              return (
                <TableRow key={z.id}>
                  <TableCell>
                    <Link href={`/zonas/${z.id}`} className="font-medium underline-offset-4 hover:underline">
                      Zona {z.numero_zona}
                    </Link>
                  </TableCell>
                  <TableCell>{bairro?.nome ?? "—"}</TableCell>
                  <TableCell>{bairro?.municipios?.nome ?? "—"}</TableCell>
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
