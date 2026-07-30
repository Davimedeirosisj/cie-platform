"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  validateInput,
  parseFormData,
  ValidationError,
  checkRateLimit,
  resetRateLimit,
  RateLimitError,
} from "@/lib/auth";
import {
  SignInSchema,
  SignUpSchema,
} from "@/lib/validation";

export type AuthActionState = { error: string | null };

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    // Rate limiting
    await checkRateLimit("LOGIN");

    const formDataObj = parseFormData(formData);
    const validated = validateInput(SignInSchema, formDataObj);

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      console.error("Erro de login:", error.message);
      return { error: "Email ou senha inválidos. Tente novamente." };
    }

    // Login bem-sucedido, resetar rate limit
    await resetRateLimit("LOGIN");

    redirect("/dashboard");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { error: error.message };
    }
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em signIn:", error);
    return { error: "Erro ao fazer login. Tente novamente." };
  }
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    // Rate limiting
    await checkRateLimit("SIGNUP");

    const formDataObj = parseFormData(formData);
    const validated = validateInput(SignUpSchema, formDataObj);

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: { data: { nome: validated.nome } },
    });

    if (error) {
      console.error("Erro de signup:", error.message);
      return { error: "Não foi possível criar a conta. Email já existe?" };
    }

    if (!data.session) {
      return {
        error:
          "Conta criada! Confirme seu email através do link enviado pelo Supabase antes de entrar.",
      };
    }

    // Signup bem-sucedido, resetar rate limit
    await resetRateLimit("SIGNUP");

    redirect("/dashboard");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { error: error.message };
    }
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em signUp:", error);
    return { error: "Erro ao criar conta. Tente novamente." };
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
