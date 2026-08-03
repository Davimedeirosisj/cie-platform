import { createClient } from "@/lib/supabase/client";

export type CampanhaMeta = { id: string; nome: string };

/**
 * The campaign goals belong to -- always the one flagged is_campanha_meta,
 * never the campaign selected in the toolbar.
 *
 * The toolbar picks which *results* to look at (2022, 2024). A goal is planning
 * for the next election, so it is stored once against the meta campaign. Every
 * consumer that filtered goals by the selected campaign showed "—" for goals
 * that exist: Rankings and Relatórios both did,
 * while their column headers promised "Meta 2026".
 */
export async function fetchCampanhaMeta(): Promise<CampanhaMeta | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("campanhas")
    .select("id, nome")
    .eq("is_campanha_meta", true)
    .maybeSingle();
  return (data as CampanhaMeta) ?? null;
}
