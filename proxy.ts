import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // ============================================================
  // Security Headers - Sprint 4
  // ============================================================

  // Content Security Policy (CSP)
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' blob:",
    // Mapbox GL spawns its tile-decoding worker from a blob: URL. Without an
    // explicit worker-src this falls back to default-src 'self', which blocks
    // it -- and the failure is asynchronous, so the map simply stalls with
    // isStyleLoaded() === false and paints a blank container, no error thrown.
    // child-src is the legacy fallback for browsers that predate worker-src.
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "connect-src 'self' https://*.supabase.co https://*.mapbox.com https://api.mapbox.com",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  // HTTP Strict Transport Security (HSTS)
  const hstsHeader = "max-age=31536000; includeSubDomains; preload";

  // Other security headers
  const xContentTypeOptionsHeader = "nosniff";
  const xFrameOptionsHeader = "DENY";
  const xXssProtectionHeader = "1; mode=block";
  const referrerPolicyHeader = "strict-origin-when-cross-origin";
  const permissionsPolicyHeader = [
    "accelerometer=()",
    "ambient-light-sensor=()",
    "autoplay=()",
    "battery=()",
    "camera=()",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "midi=()",
    "payment=()",
    "usb=()",
    "xr-spatial-tracking=()",
  ].join(", ");

  // ============================================================
  // CORS Headers
  // ============================================================

  const originHeader = request.headers.get("origin");
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean);

  const isOriginAllowed = allowedOrigins.includes(originHeader || "");

  if (isOriginAllowed) {
    response.headers.set("Access-Control-Allow-Origin", originHeader || "");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  // ============================================================
  // Add Security Headers
  // ============================================================

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("Strict-Transport-Security", hstsHeader);
  response.headers.set("X-Content-Type-Options", xContentTypeOptionsHeader);
  response.headers.set("X-Frame-Options", xFrameOptionsHeader);
  response.headers.set("X-XSS-Protection", xXssProtectionHeader);
  response.headers.set("Referrer-Policy", referrerPolicyHeader);
  response.headers.set("Permissions-Policy", permissionsPolicyHeader);

  // Remove sensitive headers
  response.headers.delete("X-Powered-By");
  response.headers.delete("Server");

  // ============================================================
  // Handle CORS preflight
  // ============================================================

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  return response;
}

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
