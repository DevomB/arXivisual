/**
 * Microsoft Clarity consent — the one place that loads the Clarity tag, talks
 * to its consent API and remembers the visitor's answer.
 *
 * Clarity records sessions (replays, heatmaps) from the moment its tag loads;
 * its Consent Mode only decides whether it may also set cookies. So consent
 * here gates the tag itself, not just cookie storage: nothing is fetched from
 * clarity.ms and nothing is recorded until the visitor clicks Accept in
 * components/ConsentBar.tsx. Decline — or no answer yet — means Clarity never
 * loads. On Accept we grant analytics storage only; ads storage stays denied.
 * A stored "granted" is replayed once on every later page load.
 *
 * Client only. No-op when NEXT_PUBLIC_CLARITY_PROJECT_ID is unset.
 */
import Clarity from "@microsoft/clarity";

declare global {
  interface Window {
    /** Queue stub installed by Clarity.init(); real tag replaces it on load. */
    clarity?: (...args: unknown[]) => void;
  }
}

export const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "";

/** Single source of truth for "is Clarity on in this build". */
export function isClarityConfigured(): boolean {
  return Boolean(CLARITY_PROJECT_ID);
}

export type ConsentChoice = "granted" | "denied";

const STORAGE_KEY = "arxivisual.clarity-consent";

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Inject the Clarity tag. Private on purpose: the only callers are the two
 * "consent is granted" paths below. Clarity.init() is idempotent (it checks
 * for its own script element), so Accept after a replayed grant is harmless.
 */
function startClarity(): void {
  if (typeof window === "undefined" || !CLARITY_PROJECT_ID) return;
  try {
    Clarity.init(CLARITY_PROJECT_ID);
  } catch {
    // Analytics must never break the page.
  }
}

function signalConsent(choice: ConsentChoice): void {
  // Clarity.init() installs the window.clarity queue, so a call made before
  // the tag finishes loading is replayed, not lost. Without init (no project
  // id, or consent never granted) there is nothing to talk to.
  if (typeof window === "undefined" || typeof window.clarity !== "function") return;
  try {
    Clarity.consentV2({ ad_Storage: "denied", analytics_Storage: choice });
  } catch {
    // Consent signalling must never break the page.
  }
}

/** Persist the visitor's choice; on Accept, load Clarity and tell it. */
export function setClarityConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Private mode / blocked storage: the bar simply asks again next visit.
  }
  // Accept starts recording from this page view on. Decline loads nothing;
  // the signal below only matters if the tag is somehow already running.
  if (choice === "granted") startClarity();
  signalConsent(choice);
}

/**
 * Once per page load, from instrumentation-client.ts: a visitor who accepted
 * on an earlier visit gets Clarity (with analytics storage granted); everyone
 * else — declined, or not asked yet — gets nothing until they click Accept.
 */
export function applyStoredClarityConsent(): void {
  if (getStoredConsent() !== "granted") return;
  startClarity();
  signalConsent("granted");
}
