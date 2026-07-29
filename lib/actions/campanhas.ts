"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  protectedAction,
  validateInput,
  parseFormData,
  ValidationError,
} from "@/lib/auth";
import {
  CreateCampanhaSchema,
  UpdateCampanhaStatusSchema,
} from "@/lib/validation";
import type { FormActionState } from "@/lib/actions/territorio";

const noError: FormActionState = { error: null };

export async function createCampanha(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    return await protectedAction(async (user) => {
      const formDataObj = parseFormData(formData);

      const validated = validateInput(CreateCampanhaSchema, {
        nome: formDataObj.nome,
        cargo: formDataObj.cargo,
        ano: Number(formDataObj.ano),
        status: formDataObj.status || "planejamento",
        is_campanha_meta: formDataObj.is_campanha_meta === "on",
      });

      const supabase = await createClient();
      const { error } = await supabase.from("campanhas").insert(validated);

      if (error) {
        console.error(`[${user.id}] Erro ao criar campanha:`, error);
        return { error: "Não foi possível criar a campanha." };
      }

      revalidatePath("/configuracoes/campanhas");
      return noError;
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em createCampanha:", error);
    return { error: "Erro ao criar campanha. Tente novamente." };
  }
}

export async function updateCampanhaStatus(
  id: string,
  status: string,
): Promise<void> {
  try {
    await protectedAction(async (user) => {
      const validated = validateInput(UpdateCampanhaStatusSchema, { id, status });

      const supabase = await createClient();
      const { error } = await supabase
        .from("campanhas")
        .update({ status: validated.status })
        .eq("id", validated.id);

      if (error) {
        console.error(`[${user.id}] Erro ao atualizar status da campanha:`, error);
        throw new Error("Não foi possível atualizar a campanha.");
      }

      revalidatePath("/configuracoes/campanhas");
    });
  } catch (error) {
    console.error("Erro em updateCampanhaStatus:", error);
    throw error;
  }
}
