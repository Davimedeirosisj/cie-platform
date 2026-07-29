export {
  protectedAction,
  getAuthUser,
  validateInput,
  parseFormData,
  AuthorizationError,
  NotAuthenticatedError,
  ValidationError,
  type AuthUser,
  type ProtectedActionOptions,
} from "./protected-action";

export {
  requireRole,
  requireAdminOrOwner,
  requireCampanhaAccess,
  hasHigherOrEqualRole,
  RoleHierarchy,
  type UserRole,
} from "./authorization";

export {
  checkRateLimit,
  resetRateLimit,
  getClientIp,
  RateLimitError,
  type RateLimitType,
} from "./rate-limiter";
