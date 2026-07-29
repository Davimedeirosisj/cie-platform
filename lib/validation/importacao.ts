import { z } from "zod";

export const ImportBatchSchema = z.object({
  campanha_id: z.string().uuid("Campanha inválida"),
  estado_id: z.string().uuid("Estado inválido"),
  batch_id: z.string().uuid("Batch ID inválido"),
  rows: z
    .array(
      z.record(z.any()),
      {
        errorMap: () => ({ message: "Rows deve ser um array de objetos" }),
      }
    )
    .min(1, "Deve haver pelo menos 1 linha para importar")
    .max(10000, "Máximo 10000 linhas por batch"),
});

export const ImportRowSchema = z.record(z.string(), z.any()).strict();

export const ImportProgressSchema = z.object({
  campanha_id: z.string().uuid(),
  batch_id: z.string().uuid(),
  total: z.number().int().min(0),
  sucesso: z.number().int().min(0),
  erro: z.number().int().min(0),
});

export const ImportFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", {
      message: "Apenas arquivos XLSX são permitidos",
    })
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "Arquivo não pode exceder 10MB",
    }),
  campaña_id: z.string().uuid("Campanha inválida"),
});

export type ImportBatchInput = z.infer<typeof ImportBatchSchema>;
export type ImportRowInput = z.infer<typeof ImportRowSchema>;
export type ImportProgressInput = z.infer<typeof ImportProgressSchema>;
