"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import {
  protectedAction,
  validateInput,
  parseFormData,
  ValidationError,
} from "@/lib/auth";
import { InviteUserSchema, UpdateUserRoleSchema } from "@/lib/validation";
import type { FormActionState } from "@/lib/actions/territorio";

const noError: FormActionState = { error: null };

export async function inviteUser(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    return await protectedAction(async (user) => {
      if (!hasServiceRoleKey()) {
        throw new ValidationError(
          "Convite indisponível: configure SUPABASE_SERVICE_ROLE_KEY no ambiente.",
        );
      }

      const formDataObj = parseFormData(formData);
      const validated = validateInput(InviteUserSchema, formDataObj);

      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.inviteUserByEmail(validated.email, {
        data: { nome: validated.nome },
      });

      if (error || !data.user) {
        console.error(`[${user.id}] Erro ao convidar usuário:`, error);
        return { error: "Não foi possível enviar o convite. " + (error?.message ?? "") };
      }

      // The fn_handle_new_user trigger already created the profile row with
      // role='consultor' by default -- set it to whatever role was chosen.
      const supabase = await createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ nome: validated.nome, role: validated.role })
        .eq("id", data.user.id);

      if (updateError) {
        console.error(`[${user.id}] Erro ao definir role do convidado:`, updateError);
        return { error: "Convite enviado, mas não foi possível definir o perfil de acesso." };
      }

      revalidatePath("/configuracoes/usuarios");
      return noError;
    }, { requiredRole: "super_admin" });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em inviteUser:", error);
    return { error: "Erro ao convidar usuário. Tente novamente." };
  }
}

export async function updateUserRole(id: string, role: string): Promise<void> {
  await protectedAction(async (user) => {
    const validated = validateInput(UpdateUserRoleSchema, { id, role });

    if (validated.id === user.id) {
      throw new ValidationError("Você não pode alterar seu próprio perfil de acesso.");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: validated.role })
      .eq("id", validated.id);

    if (error) {
      console.error(`[${user.id}] Erro ao atualizar role:`, error);
      throw new Error("Não foi possível atualizar o perfil de acesso.");
    }

    revalidatePath("/configuracoes/usuarios");
  }, { requiredRole: "super_admin" });
}

export async function toggleUserActive(id: string, ativo: boolean): Promise<void> {
  await protectedAction(async (user) => {
    if (id === user.id) {
      throw new ValidationError("Você não pode desativar sua própria conta.");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ ativo }).eq("id", id);

    if (error) {
      console.error(`[${user.id}] Erro ao atualizar status do usuário:`, error);
      throw new Error("Não foi possível atualizar o status do usuário.");
    }

    revalidatePath("/configuracoes/usuarios");
  }, { requiredRole: "super_admin" });
}
