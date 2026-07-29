import { createClient } from "@/lib/supabase/server";
import { AuthUser, AuthorizationError } from "./protected-action";

export type UserRole = "admin" | "gerente" | "consultor" | "leitor";

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

  const isAdmin = userRole === "admin";
  const isOwner = resourceOwnerId === user.id;

  if (!isAdmin && !isOwner) {
    console.warn(
      `[AUTHORIZATION] User ${user.id} tentou acessar recurso de outro usuário`,
    );
    throw new AuthorizationError("Você não tem permissão para acessar este recurso");
  }
}

export async function requireCampanhaAccess(
  user: AuthUser,
  campanhaId: string,
): Promise<void> {
  const supabase = await createClient();
  const userRole = await getUserRole(user.id);

  // Admins têm acesso a tudo
  if (userRole === "admin") {
    return;
  }

  // Para outros roles, verificar se tem acesso à campanha
  const { data: access, error } = await supabase
    .from("campanha_access")
    .select("id")
    .eq("campanha_id", campanhaId)
    .eq("user_id", user.id)
    .single();

  if (error || !access) {
    console.warn(
      `[AUTHORIZATION] User ${user.id} tentou acessar campanha ${campanhaId} sem permissão`,
    );
    throw new AuthorizationError("Você não tem permissão para acessar esta campanha");
  }
}

export const RoleHierarchy: Record<UserRole, number> = {
  admin: 4,
  gerente: 3,
  consultor: 2,
  leitor: 1,
};

export function hasHigherOrEqualRole(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}
