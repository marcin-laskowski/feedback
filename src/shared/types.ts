/**
 * The payload contract. Both sides compile against this file.
 *
 * Source of truth for the shape is `apps-script/Code.gs` → `buildRecord_()`.
 * The Sheet's column order is ADDITIVE ONLY, so this file is too: append
 * fields, never rename or remove them.
 */

export const SCHEMA_VERSION = 1;

/** Max length of every free-text field. Mirrors MAX_TEXT in Code.gs. */
export const MAX_TEXT = 2000;

/** Max length of the reporter's name. Mirrors the clip in Code.gs. */
export const MAX_REPORTER = 120;

/** Max bytes accepted by the route handler. A full report is ~4 kB. */
export const MAX_BODY_BYTES = 32_000;

export const FEEDBACK_TYPES = ["bug", "idea", "copy", "design"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_SEVERITIES = ["blocker", "annoying", "minor"] as const;
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];

export type DeviceKind = "desktop" | "tablet" | "mobile";

/**
 * Everything the browser knows about the moment the report was written.
 * `browser` / `os` / `device` are the CLIENT's parse – rendered in the
 * context strip. The server re-derives them from `userAgent` and never
 * trusts these three (D18).
 */
export type FeedbackContext = {
  pathname: string;
  /** Full URL including query. Redacted before it leaves the route handler. */
  href: string;
  title: string;
  viewport: string;
  screen: string;
  browser: string;
  os: string;
  device: DeviceKind;
  colorScheme: "light" | "dark";
  language: string;
  timezone: string;
  sessionId: string;
  /** Seconds on the current pathname. */
  timeOnPage: number;
  pagesVisited: string[];
  consoleErrors: string[];
  /** Overwritten server-side with the deployment's commit SHA. */
  appVersion: string;
  userAgent: string;
};

/** What the widget POSTs to `/api/feedback`. No token – the server holds it. */
export type FeedbackSubmission = {
  schemaVersion: number;
  project: string;
  type: FeedbackType;
  severity: FeedbackSeverity;
  what: string;
  why: string;
  /**
   * Who is reporting, as they typed it. A sheet shared by several reviewers is
   * useless for follow-up questions without it. Remembered per browser, so it
   * is typed once.
   */
  reporter: string;
  /**
   * Dropped from the UI – the two questions that matter are what and why, and a
   * third optional box mostly collected empty strings. The column stays in the
   * sheet (additive-only) and the field stays in the contract, so a consumer
   * that wants it back does not need a schema change.
   */
  how?: string;
  context: FeedbackContext;
  /** Honeypot. Humans never see the input, so a value here means a bot. */
  website?: string;
};

/** What the route handler POSTs to the Apps Script sink. */
export type SinkPayload = FeedbackSubmission & {
  token: string;
  environment: string;
  country: string;
};

/**
 * What the sink answers. `busy` means the script lock was held by another
 * write for longer than the sink was willing to wait, and nothing was written.
 * `stage` names where in `doPost` a failure happened; `message` is the
 * exception text. Both exist so the route handler's log can say what the sink
 * was doing when it failed.
 */
export type SinkResponse =
  | { ok: true; id: string; deployment?: string }
  | { ok: false; error: string; fields?: string[]; message?: string; stage?: string };

/**
 * What the widget gets back. Each failure code maps to a different sentence
 * in the panel, because they ask for different things from the reporter:
 * `busy` and `rate_limited` mean wait and retry, `timeout` means the row may
 * or may not have been written, `validation` means fix a field.
 */
export type SubmitResponse =
  | { ok: true; id: string }
  | { ok: false; error: "validation"; fields: string[] }
  | { ok: false; error: "rate_limited" | "busy" | "timeout" | "unavailable" | "server" };

export type SubmitError = Extract<SubmitResponse, { ok: false }>["error"];
