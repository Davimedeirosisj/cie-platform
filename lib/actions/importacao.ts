"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  protectedAction,
  validateInput,
  ValidationError,
} from "@/lib/auth";
import { ImportBatchSchema } from "@/lib/validation";
import type { ColumnMapping, MappedRow } from "@/lib/types/import";
import { z } from "zod";

export type RunImportResult =
  | { ok: true; batchId: string; total: number; sucesso: number; erro: number }
  | { ok: false; error: string };

const ImportResultSchema = z.object({
  total: z.number().int().min(0),
  sucesso: z.number().int().min(0),
  erro: z.number().int().min(0),
});

export async function runImport(
  campanhaId: string,
  nomeArquivo: string,
  storagePath: string,
  mapeamento: ColumnMapping,
  rows: MappedRow[],
): Promise<RunImportResult> {
  try {
    return await protectedAction(async (user) => {
      if (!campanhaId || !/^[0-9a-f-]{36}$/.test(campanhaId)) {
        throw new ValidationError("Campanha inválida");
      }

      const validated = validateInput(ImportBatchSchema, {
        campanha_id: campanhaId,
        rows,
      });

      const supabase = await createClient();

      const { data: estado, error: estadoError } = await supabase
        .from("estados")
        .select("id")
        .limit(1)
        .single();

      if (estadoError || !estado) {
        console.error(`[${user.id}] Nenhum estado cadastrado`);
        return { ok: false, error: "Nenhum estado cadastrado." };
      }

      const { data: batch, error: batchError } = await supabase
        .from("import_batches")
        .insert({
          campanha_id: validated.campanha_id,
          nome_arquivo: nomeArquivo.substring(0, 255),
          storage_path: storagePath.substring(0, 500),
          mapeamento_snapshot: mapeamento,
          status: "processando",
          total_linhas: validated.rows.length,
        })
        .select("id")
        .single();

      if (batchError || !batch) {
        console.error(`[${user.id}] Erro ao criar lote:`, batchError);
        return { ok: false, error: "Não foi possível criar o lote de importação." };
      }

      const { data: resultado, error: rpcError } = await supabase
        .rpc("fn_import_votos_batch", {
          p_campanha_id: validated.campanha_id,
          p_batch_id: batch.id,
          p_estado_id: estado.id,
          p_rows: validated.rows,
        })
        .single();

      if (rpcError || !resultado) {
        console.error(`[${user.id}] Erro no RPC de import:`, rpcError);
        return { ok: false, error: "Falha ao processar a importação." };
      }

      const importResult = validateInput(ImportResultSchema, resultado);

      revalidatePath("/importacao");
      revalidatePath(`/importacao/${batch.id}`);

      return {
        ok: true,
        batchId: batch.id,
        total: importResult.total,
        sucesso: importResult.sucesso,
        erro: importResult.erro,
      };
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, error: error.message };
    }
    console.error("Erro em runImport:", error);
    return { ok: false, error: "Erro ao processar importação. Tente novamente." };
  }
}

export async function saveColumnMapping(
  nome: string,
  mapeamento: ColumnMapping,
): Promise<{ error: string | null }> {
  try {
    return await protectedAction(async (user) => {
      if (!nome || nome.length < 1 || nome.length > 255) {
        throw new ValidationError("Nome do mapeamento inválido");
      }

      if (!mapeamento || typeof mapeamento !== "object") {
        throw new ValidationError("Mapeamento inválido");
      }

      const supabase = await createClient();
      const { error } = await supabase.from("import_column_mappings").insert({
        nome: nome.substring(0, 255),
        mapeamento,
      });

      if (error) {
        console.error(`[${user.id}] Erro ao salvar mapeamento:`, error);
        return { error: "Não foi possível salvar o mapeamento." };
      }

      revalidatePath("/importacao");
      return { error: null };
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em saveColumnMapping:", error);
    return { error: "Erro ao salvar mapeamento. Tente novamente." };
  }
}
