import type { NextConfig } from "next";

// Baseline security headers sent on every route, the admin panel included.
// - X-Frame-Options and CSP frame-ancestors stop other sites from framing the
//   pages (clickjacking against admin status and delete actions). The first
//   covers older browsers, the second is the modern equivalent.
// - nosniff stops browsers from guessing content types.
// - Referrer-Policy keeps full URLs (query strings included) from leaking to
//   other origins.
// - Permissions-Policy turns off device features the site never uses.
// A script-src CSP is left out for now: Next's inline bootstrap scripts need
// per-request nonces from middleware before one can be enforced.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in an X-Powered-By response header.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  eslint: {
    // Keep production builds green even if lint rules churn across versions.
    // `npm run lint` still runs ESLint on demand. Flip to `false` to enforce
    // linting as part of `next build`.
    ignoreDuringBuilds: true,
  },
  // TypeScript errors DO block the build on purpose — `tsc` is our real gate.
  experimental: {
    serverActions: {
      // Admin product photos are posted through a Server Action (FormData),
      // and Next caps Server Action bodies at 1 MB by default, which rejects
      // typical photos with a 413. Raise it to 5 MB. Vercel caps request
      // bodies at about 4.5 MB anyway, so MedicineForm should also reject
      // files over about 4 MB before submitting.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
