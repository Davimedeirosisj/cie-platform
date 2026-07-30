import { z } from "zod";

export const InviteUserSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase(),
  nome: z.string().min(1, "Nome é obrigatório").max(255, "Nome não pode exceder 255 caracteres").trim(),
  role: z.enum(["super_admin", "admin", "coordenador_regional", "consultor"]),
});

export const UpdateUserRoleSchema = z.object({
  id: z.string().uuid("ID inválido"),
  role: z.enum(["super_admin", "admin", "coordenador_regional", "consultor"]),
});

export const ToggleUserActiveSchema = z.object({
  id: z.string().uuid("ID inválido"),
  ativo: z.boolean(),
});

export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;
export type ToggleUserActiveInput = z.infer<typeof ToggleUserActiveSchema>;
