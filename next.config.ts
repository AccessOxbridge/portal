import type { NextConfig } from "next";

// Baseline security response headers applied to every route. A full
// Content-Security-Policy is intentionally NOT added here: the app loads
// Stripe, Supabase, Zoom and inline (framer-motion) styles, so a blind CSP
// would break those integrations. CSP is scheduled for the Chunk 4 hardening
// pass where it can be authored and tested carefully.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "geolocation=(), browsing-topics=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/dashboard/admin/create-account': ['./lib/email/attachments/**/*'],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    serverActions: {
      // Mentor onboarding uploads (photo + CV) can exceed the default 1MB limit.
      bodySizeLimit: "10mb",
    },
  },
  // Typecheck is enforced again. utils/supabase/types.ts has been regenerated
  // against the live database and the errors it was masking are fixed, so
  // `next build` fails on type errors rather than shipping past them.
};

export default nextConfig;
