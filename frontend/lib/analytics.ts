/**
 * Vendor-agnostic product-analytics wrapper (client only).
 *
 * `track()` forwards to whatever `instrumentation-client.ts` registered
 * (PostHog in production). Until that happens — every build without
 * NEXT_PUBLIC_POSTHOG_KEY, and always during SSR — it is a silent no-op, so
 * call sites never need to know whether analytics is on.
 *
 * Never import this from a server component: it only makes sense where a
 * user is clicking, and the registered sink touches `window`.
 */

export type AnalyticsProps = Record<string, unknown>;
type CaptureFn = (event: string, props?: AnalyticsProps) => void;
type CaptureErrorFn = (error: unknown, props?: AnalyticsProps) => void;

// Module-level "ready" flag: null until instrumentation-client.ts registers a
// sink, which only happens when the analytics key is configured.
let capture: CaptureFn | null = null;
let captureError: CaptureErrorFn | null = null;

/** Called once by instrumentation-client.ts after the vendor SDK is initialised. */
export function registerAnalytics(fn: CaptureFn, errorFn?: CaptureErrorFn): void {
  capture = fn;
  captureError = errorFn ?? null;
}

export function isAnalyticsReady(): boolean {
  return capture !== null;
}

/**
 * Record a product event. Event names are shared with the backend's
 * server-side counterparts (paper_start ↔ paper_accepted, paper_ready ↔
 * paper_completed, paper_failed ↔ paper_failed_server) — keep them stable.
 * Each of those pairs joins on the `job_id` property, the only key the server
 * events have. paper_start_rejected (the start request was refused, so no job
 * exists) is browser-only.
 */
export function track(event: string, props?: AnalyticsProps): void {
  if (typeof window === "undefined" || capture === null) return;
  try {
    capture(event, props);
  } catch {
    // Analytics must never break the page.
  }
}

/**
 * Report an error that a React error boundary caught (app/error.tsx,
 * app/global-error.tsx). Uncaught errors and unhandled rejections reach the
 * SDK on their own (`capture_exceptions`); a boundary swallows its error
 * before `window.onerror` ever sees it, so those have to be forwarded by
 * hand. Same contract as `track()`: a silent no-op until a sink is
 * registered, and it never throws — least of all from an error page.
 */
export function reportError(error: unknown, props?: AnalyticsProps): void {
  if (typeof window === "undefined" || captureError === null) return;
  try {
    captureError(error, props);
  } catch {
    // Error reporting must never break the error page.
  }
}
