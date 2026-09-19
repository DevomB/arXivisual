/**
 * Next.js client instrumentation hook (`instrumentation-client.ts` at the app
 * root): runs once in the browser, before the app hydrates. App Router
 * navigations do not re-run it.
 *
 * Everything here is opt-in through NEXT_PUBLIC_* build args. With neither
 * variable set — local dev, CI, an image built without the args — nothing
 * initialises and no analytics request is ever made.
 */
import posthog from "posthog-js";
import { registerAnalytics } from "@/lib/analytics";
import { CLARITY_PROJECT_ID, applyStoredClarityConsent } from "@/lib/clarity-consent";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
// NEXT_PUBLIC_POSTHOG_HOST is the UI/app host (https://us.posthog.com or
// https://eu.posthog.com). PostHog's own docs use the same variable name for
// the INGEST host (https://us.i.posthog.com); accept that spelling too by
// dropping the ".i" segment, since capture always goes through /ingest here.
const POSTHOG_UI_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com")
  .replace(".i.posthog.com", ".posthog.com")
  .replace(/\/+$/, "");

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    // Same-origin reverse proxy (rewrites in next.config.ts) so capture
    // traffic is first-party; ui_host keeps toolbar/app links pointing at
    // the real PostHog UI.
    api_host: "/ingest",
    ui_host: POSTHOG_UI_HOST,
    // Dated defaults (value from the PostHog Next.js docs): pageviews fire on
    // History API changes, so App Router navigations count exactly once —
    // no manual pageview hook.
    defaults: "2026-05-30",
    // No cookies, no local/session storage. Identity is a privacy-preserving
    // hash computed on PostHog's servers; the project setting
    // "Cookieless server hash mode" must be ON or these events are dropped.
    cookieless_mode: "always",
    person_profiles: "never",
    autocapture: false,
    capture_pageleave: true,
    // Frontend error visibility — nothing else reports browser errors, least
    // of all on the self-hosted server. Uncaught errors and unhandled
    // rejections become $exception events, with the same cookieless,
    // person-less identity as every other event. Errors swallowed by the
    // React error boundaries are forwarded by hand: reportError() in
    // app/error.tsx and app/global-error.tsx.
    capture_exceptions: true,
  });
  registerAnalytics(
    (event, props) => {
      posthog.capture(event, props);
    },
    (error, props) => {
      posthog.captureException(error, props);
    },
  );
}

if (CLARITY_PROJECT_ID) {
  // Clarity records sessions as soon as its tag loads, so the tag itself
  // waits for consent: this only starts it for a visitor who already clicked
  // Accept on an earlier visit. Everyone else gets it from the Accept handler
  // in components/ConsentBar.tsx — or never.
  applyStoredClarityConsent();
}
