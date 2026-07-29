"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormActionState } from "@/lib/actions/territorio";

const noError: FormActionState = { error: null };

export async function createCampanha(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("campanhas").insert({
    nome: formData.get("nome") as string,
    cargo: formData.get("cargo") as string,
    ano: Number(formData.get("ano")),
    status: formData.get("status") as string,
    is_campanha_meta: formData.get("is_campanha_meta") === "on",
  });

  if (error) return { error: "Não foi possível criar a campanha. " + error.message };
  revalidatePath("/configuracoes/campanhas");
  return noError;
}

export async function updateCampanhaStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("campanhas").update({ status }).eq("id", id);
  revalidatePath("/configuracoes/campanhas");
}
