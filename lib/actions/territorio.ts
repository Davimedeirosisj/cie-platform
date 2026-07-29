"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormActionState = { error: string | null };
const noError: FormActionState = { error: null };

// ============ Municípios ============
export async function createMunicipio(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const supabase = await createClient();
  const { data: estado } = await supabase.from("estados").select("id").limit(1).single();
  if (!estado) return { error: "Nenhum estado cadastrado." };

  const { error } = await supabase.from("municipios").insert({
    estado_id: estado.id,
    nome: formData.get("nome") as string,
    observacoes: (formData.get("observacoes") as string) || null,
  });

  if (error) return { error: "Não foi possível criar o município. " + error.message };
  revalidatePath("/municipios");
  return noError;
}

export async function updateMunicipio(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { error } = await supabase
    .from("municipios")
    .update({
      nome: formData.get("nome") as string,
      observacoes: (formData.get("observacoes") as string) || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível atualizar o município. " + error.message };
  revalidatePath("/municipios");
  revalidatePath(`/municipios/${id}`);
  return noError;
}

export async function deleteMunicipio(id: string) {
  const supabase = await createClient();
  await supabase.from("municipios").delete().eq("id", id);
  revalidatePath("/municipios");
  redirect("/municipios");
}

// ============ Bairros ============
export async function createBairro(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("bairros").insert({
    municipio_id: formData.get("municipio_id") as string,
    nome: formData.get("nome") as string,
    observacoes: (formData.get("observacoes") as string) || null,
  });

  if (error) return { error: "Não foi possível criar o bairro. " + error.message };
  revalidatePath("/bairros");
  return noError;
}

export async function updateBairro(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { error } = await supabase
    .from("bairros")
    .update({
      nome: formData.get("nome") as string,
      observacoes: (formData.get("observacoes") as string) || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível atualizar o bairro. " + error.message };
  revalidatePath("/bairros");
  revalidatePath(`/bairros/${id}`);
  return noError;
}

export async function deleteBairro(id: string) {
  const supabase = await createClient();
  await supabase.from("bairros").delete().eq("id", id);
  revalidatePath("/bairros");
  redirect("/bairros");
}

// ============ Zonas ============
export async function createZona(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("zonas").insert({
    bairro_id: formData.get("bairro_id") as string,
    numero_zona: Number(formData.get("numero_zona")),
  });

  if (error) return { error: "Não foi possível criar a zona. " + error.message };
  revalidatePath("/zonas");
  return noError;
}

export async function deleteZona(id: string) {
  const supabase = await createClient();
  await supabase.from("zonas").delete().eq("id", id);
  revalidatePath("/zonas");
  redirect("/zonas");
}

// ============ Seções ============
export async function createSecao(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("secoes").insert({
    zona_id: formData.get("zona_id") as string,
    numero_secao: Number(formData.get("numero_secao")),
    local_votacao: (formData.get("local_votacao") as string) || null,
    endereco_local: (formData.get("endereco_local") as string) || null,
  });

  if (error) return { error: "Não foi possível criar a seção. " + error.message };
  revalidatePath("/secoes");
  return noError;
}

export async function updateSecao(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { error } = await supabase
    .from("secoes")
    .update({
      local_votacao: (formData.get("local_votacao") as string) || null,
      endereco_local: (formData.get("endereco_local") as string) || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível atualizar a seção. " + error.message };
  revalidatePath("/secoes");
  revalidatePath(`/secoes/${id}`);
  return noError;
}

export async function deleteSecao(id: string) {
  const supabase = await createClient();
  await supabase.from("secoes").delete().eq("id", id);
  revalidatePath("/secoes");
  redirect("/secoes");
}

// ============ Observações (shared shape: município / bairro) ============
export async function updateObservacoes(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const tabela = formData.get("tabela") as "municipios" | "bairros";
  const id = formData.get("id") as string;
  const observacoes = (formData.get("observacoes") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase.from(tabela).update({ observacoes }).eq("id", id);

  if (error) return { error: "Não foi possível salvar as observações. " + error.message };
  revalidatePath(`/${tabela}/${id}`);
  return noError;
}
