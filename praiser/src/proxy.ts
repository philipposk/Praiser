import { NextResponse, type NextRequest } from "next/server";

// Content-Security-Policy with a fresh nonce per request. Next adds the nonce to
// its own scripts; layout.tsx adds it to the theme pre-paint script. Only scripts
// carrying the nonce (or loaded by one, via strict-dynamic) can run, which blocks
// injected <script> and inline event handlers (Lighthouse csp-xss).
export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    // 'unsafe-inline' https: http: are ignored by browsers that understand nonces and
    // strict-dynamic; they only keep very old browsers working.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https: http:${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "media-src 'self' blob: data: https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: skip API routes, static files and prefetches.
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|json|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
