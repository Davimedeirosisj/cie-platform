import { createClient } from "@/lib/supabase/server";
import { AuthUser, AuthorizationError } from "./protected-action";

// Must match the `user_role` Postgres enum (migration 0001_init_schema.sql).
export type UserRole = "super_admin" | "admin" | "coordenador_regional" | "consultor";

export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    console.error(`Erro ao obter role para ${userId}:`, error);
    throw new AuthorizationError("Perfil não encontrado");
  }

  return (profile.role as UserRole) || "consultor";
}

export async function requireRole(
  user: AuthUser,
  requiredRoles: UserRole | UserRole[],
): Promise<void> {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  const userRole = await getUserRole(user.id);

  if (!roles.includes(userRole)) {
    console.warn(
      `[AUTHORIZATION] User ${user.id} (${userRole}) tentou acessar recurso que requer ${roles.join(", ")}`,
    );
    throw new AuthorizationError(
      `Seu role (${userRole}) não tem permissão para esta ação. Requer: ${roles.join(", ")}`,
    );
  }
}

export async function requireAdminOrOwner(
  user: AuthUser,
  resourceOwnerId: string | null,
): Promise<void> {
  const userRole = await getUserRole(user.id);

  const isAdmin = userRole === "super_admin" || userRole === "admin";
  const isOwner = resourceOwnerId === user.id;

  if (!isAdmin && !isOwner) {
    console.warn(
      `[AUTHORIZATION] User ${user.id} tentou acessar recurso de outro usuário`,
    );
    throw new AuthorizationError("Você não tem permissão para acessar este recurso");
  }
}

// Note: v1.0 has no per-campaign access table (all campanhas are visible to
// every authenticated role by design — see PRD). A requireCampanhaAccess()
// helper would need a `campanha_access` table that doesn't exist yet; add it
// here if/when territorial or campaign-level scoping is actually built.

export const RoleHierarchy: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  coordenador_regional: 2,
  consultor: 1,
};

export function hasHigherOrEqualRole(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}
