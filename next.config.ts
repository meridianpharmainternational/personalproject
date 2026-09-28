import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Keep production builds green even if lint rules churn across versions.
    // `npm run lint` still runs ESLint on demand. Flip to `false` to enforce
    // linting as part of `next build`.
    ignoreDuringBuilds: true,
  },
  // TypeScript errors DO block the build on purpose — `tsc` is our real gate.
};

export default nextConfig;
