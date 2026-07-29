import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [municipios, bairros, zonas, secoes] = await Promise.all([
    supabase.from("municipios").select("id", { count: "exact", head: true }),
    supabase.from("bairros").select("id", { count: "exact", head: true }),
    supabase.from("zonas").select("id", { count: "exact", head: true }),
    supabase.from("secoes").select("id", { count: "exact", head: true }),
  ]);

  return (
    <DashboardContent
      counts={{
        municipios: municipios.count ?? 0,
        bairros: bairros.count ?? 0,
        zonas: zonas.count ?? 0,
        secoes: secoes.count ?? 0,
      }}
    />
  );
}
