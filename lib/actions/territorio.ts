"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  protectedAction,
  validateInput,
  parseFormData,
  AuthorizationError,
  ValidationError,
} from "@/lib/auth";
import {
  CreateMunicipioSchema,
  EditMunicipioSchema,
  CreateBairroSchema,
  EditBairroSchema,
  CreateZonaSchema,
  CreateSecaoSchema,
  EditSecaoSchema,
  ObservacoesEditorSchema,
} from "@/lib/validation";

export type FormActionState = { error: string | null };
const noError: FormActionState = { error: null };

// ============ Municípios ============
export async function createMunicipio(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    return await protectedAction(async (user) => {
      const supabase = await createClient();

      const formDataObj = parseFormData(formData);
      const validated = validateInput(CreateMunicipioSchema, formDataObj);

      const { data: estado } = await supabase
        .from("estados")
        .select("id")
        .limit(1)
        .single();

      if (!estado) return { error: "Nenhum estado cadastrado." };

      const { error } = await supabase.from("municipios").insert({
        estado_id: estado.id,
        nome: validated.nome,
        observacoes: validated.observacoes,
        latitude: validated.latitude ?? null,
        longitude: validated.longitude ?? null,
      });

      if (error) {
        console.error(`[${user.id}] Erro ao criar município:`, error);
        return { error: "Não foi possível criar o município." };
      }

      revalidatePath("/municipios");
      return noError;
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    if (error instanceof AuthorizationError) {
      return { error: error.message };
    }
    console.error("Erro em createMunicipio:", error);
    return { error: "Erro ao criar município. Tente novamente." };
  }
}

export async function updateMunicipio(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    return await protectedAction(async (user) => {
      const formDataObj = parseFormData(formData);
      const validated = validateInput(EditMunicipioSchema, formDataObj);

      const supabase = await createClient();
      const { error } = await supabase
        .from("municipios")
        .update({
          nome: validated.nome,
          observacoes: validated.observacoes,
          latitude: validated.latitude ?? null,
          longitude: validated.longitude ?? null,
        })
        .eq("id", validated.id);

      if (error) {
        console.error(`[${user.id}] Erro ao atualizar município:`, error);
        return { error: "Não foi possível atualizar o município." };
      }

      revalidatePath("/municipios");
      revalidatePath(`/municipios/${validated.id}`);
      return noError;
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em updateMunicipio:", error);
    return { error: "Erro ao atualizar município. Tente novamente." };
  }
}

export async function deleteMunicipio(id: string) {
  try {
    await protectedAction(async (user) => {
      if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
        throw new ValidationError("ID inválido");
      }

      const supabase = await createClient();
      const { error } = await supabase.from("municipios").delete().eq("id", id);

      if (error) {
        console.error(`[${user.id}] Erro ao deletar município:`, error);
        throw new Error("Não foi possível deletar o município.");
      }

      revalidatePath("/municipios");
    });
    redirect("/municipios");
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error("Erro em deleteMunicipio:", error);
    throw new Error("Erro ao deletar município.");
  }
}

// ============ Bairros ============
export async function createBairro(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    return await protectedAction(async (user) => {
      const formDataObj = parseFormData(formData);
      const validated = validateInput(CreateBairroSchema, formDataObj);

      const supabase = await createClient();
      const { error } = await supabase.from("bairros").insert(validated);

      if (error) {
        console.error(`[${user.id}] Erro ao criar bairro:`, error);
        return { error: "Não foi possível criar o bairro." };
      }

      revalidatePath("/bairros");
      return noError;
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em createBairro:", error);
    return { error: "Erro ao criar bairro. Tente novamente." };
  }
}

export async function updateBairro(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    return await protectedAction(async (user) => {
      const formDataObj = parseFormData(formData);
      const validated = validateInput(EditBairroSchema, formDataObj);

      const supabase = await createClient();
      const { error } = await supabase
        .from("bairros")
        .update({
          nome: validated.nome,
          observacoes: validated.observacoes,
          latitude: validated.latitude ?? null,
          longitude: validated.longitude ?? null,
        })
        .eq("id", validated.id);

      if (error) {
        console.error(`[${user.id}] Erro ao atualizar bairro:`, error);
        return { error: "Não foi possível atualizar o bairro." };
      }

      revalidatePath("/bairros");
      revalidatePath(`/bairros/${validated.id}`);
      return noError;
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em updateBairro:", error);
    return { error: "Erro ao atualizar bairro. Tente novamente." };
  }
}

export async function deleteBairro(id: string) {
  try {
    await protectedAction(async (user) => {
      if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
        throw new ValidationError("ID inválido");
      }

      const supabase = await createClient();
      const { error } = await supabase.from("bairros").delete().eq("id", id);

      if (error) {
        console.error(`[${user.id}] Erro ao deletar bairro:`, error);
        throw new Error("Não foi possível deletar o bairro.");
      }

      revalidatePath("/bairros");
    });
    redirect("/bairros");
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error("Erro em deleteBairro:", error);
    throw new Error("Erro ao deletar bairro.");
  }
}

// ============ Zonas ============
export async function createZona(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    return await protectedAction(async (user) => {
      const formDataObj = parseFormData(formData);
      const validated = validateInput(CreateZonaSchema, formDataObj);

      const supabase = await createClient();
      const { error } = await supabase.from("zonas").insert(validated);

      if (error) {
        console.error(`[${user.id}] Erro ao criar zona:`, error);
        return { error: "Não foi possível criar a zona." };
      }

      revalidatePath("/zonas");
      return noError;
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em createZona:", error);
    return { error: "Erro ao criar zona. Tente novamente." };
  }
}

export async function deleteZona(id: string) {
  try {
    await protectedAction(async (user) => {
      if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
        throw new ValidationError("ID inválido");
      }

      const supabase = await createClient();
      const { error } = await supabase.from("zonas").delete().eq("id", id);

      if (error) {
        console.error(`[${user.id}] Erro ao deletar zona:`, error);
        throw new Error("Não foi possível deletar a zona.");
      }

      revalidatePath("/zonas");
    });
    redirect("/zonas");
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error("Erro em deleteZona:", error);
    throw new Error("Erro ao deletar zona.");
  }
}

// ============ Seções ============
export async function createSecao(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    return await protectedAction(async (user) => {
      const formDataObj = parseFormData(formData);
      const validated = validateInput(CreateSecaoSchema, formDataObj);

      const supabase = await createClient();
      const { error } = await supabase.from("secoes").insert(validated);

      if (error) {
        console.error(`[${user.id}] Erro ao criar seção:`, error);
        return { error: "Não foi possível criar a seção." };
      }

      revalidatePath("/secoes");
      return noError;
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em createSecao:", error);
    return { error: "Erro ao criar seção. Tente novamente." };
  }
}

export async function updateSecao(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    return await protectedAction(async (user) => {
      const formDataObj = parseFormData(formData);
      const validated = validateInput(EditSecaoSchema, formDataObj);

      const supabase = await createClient();
      const { error } = await supabase
        .from("secoes")
        .update({
          local_votacao: validated.local_votacao,
          endereco_local: validated.endereco_local,
        })
        .eq("id", validated.id);

      if (error) {
        console.error(`[${user.id}] Erro ao atualizar seção:`, error);
        return { error: "Não foi possível atualizar a seção." };
      }

      revalidatePath("/secoes");
      revalidatePath(`/secoes/${validated.id}`);
      return noError;
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em updateSecao:", error);
    return { error: "Erro ao atualizar seção. Tente novamente." };
  }
}

export async function deleteSecao(id: string) {
  try {
    await protectedAction(async (user) => {
      if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
        throw new ValidationError("ID inválido");
      }

      const supabase = await createClient();
      const { error } = await supabase.from("secoes").delete().eq("id", id);

      if (error) {
        console.error(`[${user.id}] Erro ao deletar seção:`, error);
        throw new Error("Não foi possível deletar a seção.");
      }

      revalidatePath("/secoes");
    });
    redirect("/secoes");
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error("Erro em deleteSecao:", error);
    throw new Error("Erro ao deletar seção.");
  }
}

// ============ Observações (shared shape: município / bairro) ============
export async function updateObservacoes(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    return await protectedAction(async (user) => {
      const formDataObj = parseFormData(formData);
      const validated = validateInput(ObservacoesEditorSchema, formDataObj);

      const tabela = formData.get("tabela") as "municipios" | "bairros";
      if (!["municipios", "bairros"].includes(tabela)) {
        throw new ValidationError("Tabela inválida");
      }

      const supabase = await createClient();
      const { error } = await supabase
        .from(tabela)
        .update({ observacoes: validated.observacoes })
        .eq("id", validated.id);

      if (error) {
        console.error(`[${user.id}] Erro ao atualizar observações:`, error);
        return { error: "Não foi possível salvar as observações." };
      }

      revalidatePath(`/${tabela}/${validated.id}`);
      return noError;
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em updateObservacoes:", error);
    return { error: "Erro ao salvar observações. Tente novamente." };
  }
}
