"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
  PedirResetSchema,
  RedefinirSenhaSchema,
} from "@/lib/validation";

export type AuthActionState = { error: string | null };

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  // NOTE: redirect() signals success by *throwing* NEXT_REDIRECT, so it must
  // stay outside the try/catch below -- otherwise every successful login is
  // caught and logged as if it had failed.
  try {
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

  redirect("/dashboard");
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  // See the note in signIn(): redirect() must stay outside the try/catch.
  try {
    await checkRateLimit("SIGNUP");

    const formDataObj = parseFormData(formData);
    const validated = validateInput(SignUpSchema, formDataObj);

    const supabase = await createClient();

    const { data: superAdminExists } = await supabase.rpc("fn_super_admin_exists");
    if (superAdminExists) {
      return {
        error: "Cadastro fechado. Peça acesso a um administrador em Configurações › Usuários.",
      };
    }

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

  redirect("/dashboard");
}

export type ResetActionState = { error: string | null; enviado: boolean };

/**
 * Envia o email de recuperação.
 *
 * Responde "enviado" mesmo quando o email não existe. Dizer "esse email não
 * está cadastrado" transformaria o formulário num verificador de quem faz parte
 * da campanha, aberto a qualquer um. O custo é o usuário legítimo que digitou
 * errado esperar um email que não vem -- por isso a tela diz "se este email
 * estiver cadastrado".
 */
export async function pedirResetSenha(
  _prevState: ResetActionState,
  formData: FormData,
): Promise<ResetActionState> {
  try {
    await checkRateLimit("RESET_SENHA");

    const validated = validateInput(PedirResetSchema, parseFormData(formData));

    // O link do email precisa voltar para a origem que o usuário está usando,
    // senão produção manda para localhost -- exatamente o que aconteceu quando
    // o Site URL do Supabase ficou apontando para desenvolvimento.
    const origem = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
      redirectTo: `${origem}/auth/callback?next=/redefinir-senha`,
    });

    if (error) {
      console.error("Erro ao pedir reset de senha:", error.message);
    }
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof ValidationError) {
      return { error: error.message, enviado: false };
    }
    console.error("Erro em pedirResetSenha:", error);
    return { error: "Erro ao solicitar a recuperação. Tente novamente.", enviado: false };
  }

  return { error: null, enviado: true };
}

/**
 * Grava a senha nova. Só funciona dentro da sessão de recuperação criada pelo
 * link do email -- updateUser age sobre o usuário da sessão atual, então não há
 * como trocar a senha de outra pessoa por aqui.
 */
export async function redefinirSenha(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  // See the note in signIn(): redirect() must stay outside the try/catch.
  try {
    const validated = validateInput(RedefinirSenhaSchema, parseFormData(formData));

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "Link expirado ou já utilizado. Peça uma nova recuperação de senha.",
      };
    }

    const { error } = await supabase.auth.updateUser({ password: validated.password });

    if (error) {
      console.error("Erro ao redefinir senha:", error.message);
      return { error: "Não foi possível salvar a senha nova. Tente novamente." };
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    console.error("Erro em redefinirSenha:", error);
    return { error: "Erro ao redefinir a senha. Tente novamente." };
  }

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
