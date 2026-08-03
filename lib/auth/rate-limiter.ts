import { headers } from "next/headers";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const LIMITS = {
  LOGIN: { attempts: 5, windowMs: 15 * 60 * 1000 }, // 5 tentativas em 15 min
  SIGNUP: { attempts: 3, windowMs: 60 * 60 * 1000 }, // 3 tentativas em 1 hora
  // Cada pedido dispara um email. Sem limite, o formulário vira ferramenta de
  // spam contra o endereço de qualquer pessoa da campanha.
  RESET_SENHA: { attempts: 3, windowMs: 60 * 60 * 1000 }, // 3 pedidos em 1 hora
  IMPORT: { attempts: 10, windowMs: 60 * 60 * 1000 }, // 10 imports em 1 hora
};

export type RateLimitType = keyof typeof LIMITS;

export class RateLimitError extends Error {
  constructor(
    public retryAfter: number,
    message: string = "Muitas tentativas. Tente novamente mais tarde.",
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

export async function checkRateLimit(type: RateLimitType): Promise<void> {
  const ip = await getClientIp();
  const key = `${type}:${ip}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);
  const limit = LIMITS[type];

  // Limpar entrada antiga
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key);
  }

  // Obter entrada atual
  const current = rateLimitStore.get(key) || {
    count: 0,
    resetTime: now + limit.windowMs,
  };

  // Verificar limite
  if (current.count >= limit.attempts) {
    const secondsUntilReset = Math.ceil((current.resetTime - now) / 1000);
    throw new RateLimitError(
      secondsUntilReset,
      `Limite de tentativas excedido. Tente novamente em ${secondsUntilReset}s.`,
    );
  }

  // Incrementar contador
  current.count++;
  rateLimitStore.set(key, current);
}

export async function resetRateLimit(type: RateLimitType): Promise<void> {
  const ip = await getClientIp();
  const key = `${type}:${ip}`;
  rateLimitStore.delete(key);
}

// Note: this store is an in-memory Map, scoped to a single server process.
// On Vercel's serverless runtime each cold start gets its own instance, so
// these limits are best-effort (not a hard guarantee) rather than a global
// rate limit across all traffic. Fine for a low-traffic, single-admin
// internal tool; revisit with a shared store (e.g. a Postgres table) if
// this ever needs to hold under real abuse.
declare global {
  var _rateLimitCleanupInterval: ReturnType<typeof setInterval> | undefined;
}

if (typeof global !== "undefined" && !global._rateLimitCleanupInterval) {
  global._rateLimitCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
