import { createClient } from "@/lib/supabase/server";
import { z, type ZodSchema } from "zod";

export class AuthorizationError extends Error {
  constructor(message: string = "Não autorizado") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotAuthenticatedError extends Error {
  constructor(message: string = "Não autenticado") {
    super(message);
    this.name = "NotAuthenticatedError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export interface ProtectedActionOptions {
  requiredRole?: string | string[];
  skipRoleCheck?: boolean;
}

export async function getAuthUser(): Promise<AuthUser> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    throw new NotAuthenticatedError();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    throw new AuthorizationError("Perfil não encontrado");
  }

  return {
    id: authUser.id,
    email: authUser.email || "",
    role: profile.role || "consultor",
  };
}

export async function protectedAction<T>(
  action: (user: AuthUser) => Promise<T>,
  options?: ProtectedActionOptions
): Promise<T> {
  try {
    const user = await getAuthUser();

    if (!options?.skipRoleCheck && options?.requiredRole) {
      const allowedRoles = Array.isArray(options.requiredRole)
        ? options.requiredRole
        : [options.requiredRole];

      if (!allowedRoles.includes(user.role || "")) {
        throw new AuthorizationError(
          `Requer permissão. Seu role: ${user.role}`
        );
      }
    }

    return await action(user);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotAuthenticatedError) {
      throw error;
    }
    throw error;
  }
}

export function validateInput<T extends ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new ValidationError(`Dados inválidos: ${messages}`);
  }
  return result.data;
}

type FormValue = FormDataEntryValue | FormDataEntryValue[];

export function parseFormData(formData: FormData): Record<string, FormValue> {
  const data: Record<string, FormValue> = {};

  formData.forEach((value, key) => {
    if (key.endsWith("[]")) {
      const arrayKey = key.slice(0, -2);
      const existing = data[arrayKey];
      data[arrayKey] = Array.isArray(existing) ? [...existing, value] : [value];
    } else if (key in data) {
      const existing = data[key];
      data[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      data[key] = value;
    }
  });

  return data;
}
