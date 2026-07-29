import { z } from "zod";

export const CreateCampanhaSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(255, "Nome não pode exceder 255 caracteres")
    .trim(),
  cargo: z
    .string()
    .min(1, "Cargo é obrigatório")
    .max(255, "Cargo não pode exceder 255 caracteres")
    .trim(),
  ano: z
    .number()
    .int("Ano deve ser um inteiro")
    .min(1900, "Ano deve ser maior que 1900")
    .max(new Date().getFullYear() + 10, `Ano não pode ser maior que ${new Date().getFullYear() + 10}`),
  status: z
    .enum(["planejamento", "ativa", "encerrada"])
    .default("planejamento"),
  is_campanha_meta: z
    .boolean()
    .default(false),
});

export const EditCampanhaSchema = CreateCampanhaSchema.extend({
  id: z.string().uuid("ID inválido"),
});

export const UpdateCampanhaStatusSchema = z.object({
  id: z.string().uuid("ID inválido"),
  status: z.enum(["planejamento", "ativa", "encerrada"]),
});

export type CreateCampanhaInput = z.infer<typeof CreateCampanhaSchema>;
export type EditCampanhaInput = z.infer<typeof EditCampanhaSchema>;
export type UpdateCampanhaStatusInput = z.infer<typeof UpdateCampanhaStatusSchema>;
