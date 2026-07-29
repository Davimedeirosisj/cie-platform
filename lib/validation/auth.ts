import { z } from "zod";

export const SignInSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .toLowerCase(),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(255, "Senha não pode exceder 255 caracteres"),
});

export const SignUpSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(255, "Senha não pode exceder 255 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  nome: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(255, "Nome não pode exceder 255 caracteres")
    .trim(),
});

export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
