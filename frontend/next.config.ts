import type { NextConfig } from "next";

// PostHog reverse proxy. The SDK (instrumentation-client.ts) talks to
// /ingest on our own origin and these rewrites forward it to PostHog, so the
// capture traffic is first-party. Hostnames are the ones in PostHog's Next.js
// proxy docs; the region follows NEXT_PUBLIC_POSTHOG_HOST (the UI host):
// https://eu.posthog.com selects the EU ingest/assets hosts, anything else US.
// Evaluated at `next build` — the build arg must be present then, not at run.
const POSTHOG_ENABLED = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
const POSTHOG_REGION = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "").includes("eu.") ? "eu" : "us";

// Baseline response headers for every path. Deliberately no CSP here:
// Turnstile, the PostHog /ingest proxy, R2-hosted video and KaTeX all need
// allowances, and a wrong policy is an outage rather than a hardening.
// HSTS carries no includeSubDomains/preload — those commit every subdomain of
// arxivisual.org and are not undoable on a whim. Browsers ignore HSTS over
// plain http, so local `next start` is unaffected.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  // Self-hosted on Azure Container Apps: `next build` emits a minimal Node
  // server plus only the files it traces into .next/standalone, which the
  // Dockerfile copies into a small runtime image (no node_modules, no Vercel).
  output: "standalone",

  // Don't advertise the framework in `X-Powered-By`.
  poweredByHeader: false,

  // Nothing in the app uses next/image, but the optimizer endpoint is live on
  // any Next server regardless: /_next/image would resize and re-encode on
  // request, on our CPU. `unoptimized` makes that route answer 404.
  images: { unoptimized: true },

  // PostHog posts to /ingest/e/ (trailing slash); Next would otherwise 308 it
  // to /ingest/e before the rewrite. The flag is global, so proxy.ts restores
  // the redirect for every other path (/explore/ → /explore).
  skipTrailingSlashRedirect: true,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  async rewrites() {
    if (!POSTHOG_ENABLED) return [];
    return [
      {
        source: "/ingest/static/:path*",
        destination: `https://${POSTHOG_REGION}-assets.i.posthog.com/static/:path*`,
      },
      {
        source: "/ingest/array/:path*",
        destination: `https://${POSTHOG_REGION}-assets.i.posthog.com/array/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `https://${POSTHOG_REGION}.i.posthog.com/:path*`,
      },
    ];
  },
};

export default nextConfig;
