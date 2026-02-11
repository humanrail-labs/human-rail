import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const KYC_SERVICE_HOST = process.env.NEXT_PUBLIC_KYC_SERVICE_URL
  ? new URL(process.env.NEXT_PUBLIC_KYC_SERVICE_URL).origin
  : "http://localhost:3100";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `connect-src 'self' https://*.helius-rpc.com https://*.solana.com https://api.devnet.solana.com https://api.mainnet-beta.solana.com wss://*.solana.com ${KYC_SERVICE_HOST}`,
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", CSP_DIRECTIVES);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and _next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
