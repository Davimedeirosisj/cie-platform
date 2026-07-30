import { z } from "zod";

// estado_id and batch_id aren't known yet at the point runImport() validates
// its input (they're resolved from the DB afterwards), so they're not part
// of this schema -- only what the caller actually supplies up front.
export const ImportBatchSchema = z.object({
  campanha_id: z.string().uuid("Campanha inválida"),
  rows: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "Deve haver pelo menos 1 linha para importar")
    .max(10000, "Máximo 10000 linhas por batch"),
});

export type ImportBatchInput = z.infer<typeof ImportBatchSchema>;
