"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ColumnMapping, MappedRow } from "@/lib/types/import";

export type RunImportResult =
  | { ok: true; batchId: string; total: number; sucesso: number; erro: number }
  | { ok: false; error: string };

export async function runImport(
  campanhaId: string,
  nomeArquivo: string,
  storagePath: string,
  mapeamento: ColumnMapping,
  rows: MappedRow[],
): Promise<RunImportResult> {
  const supabase = await createClient();

  const { data: estado, error: estadoError } = await supabase
    .from("estados")
    .select("id")
    .limit(1)
    .single();
  if (estadoError || !estado) return { ok: false, error: "Nenhum estado cadastrado." };

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      campanha_id: campanhaId,
      nome_arquivo: nomeArquivo,
      storage_path: storagePath,
      mapeamento_snapshot: mapeamento,
      status: "processando",
      total_linhas: rows.length,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { ok: false, error: "Não foi possível criar o lote de importação. " + batchError?.message };
  }

  const { data: resultado, error: rpcError } = await supabase
    .rpc("fn_import_votos_batch", {
      p_campanha_id: campanhaId,
      p_batch_id: batch.id,
      p_estado_id: estado.id,
      p_rows: rows,
    })
    .single();

  if (rpcError || !resultado) {
    return { ok: false, error: "Falha ao processar a importação. " + rpcError?.message };
  }

  revalidatePath("/importacao");
  revalidatePath(`/importacao/${batch.id}`);

  const r = resultado as { total: number; sucesso: number; erro: number };
  return { ok: true, batchId: batch.id, total: r.total, sucesso: r.sucesso, erro: r.erro };
}

export async function saveColumnMapping(nome: string, mapeamento: ColumnMapping) {
  const supabase = await createClient();
  const { error } = await supabase.from("import_column_mappings").insert({ nome, mapeamento });
  revalidatePath("/importacao");
  return { error: error?.message ?? null };
}
