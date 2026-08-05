/**
 * Everything the report carries besides the three text fields.
 *
 * Collected at panel-open time (the strip renders it) and again at submit, so
 * a viewport resized mid-sentence is recorded as it was when the user hit send.
 */

import type { FeedbackContext } from "../shared/types";
import { parseUserAgent } from "../shared/ua";
import { readErrors } from "./errorBuffer";
import { getPagesVisited, getTimeOnPage } from "./nav";
import { read, write } from "./storage";

const SESSION_KEY = "fb.sid";

export function collectContext(): FeedbackContext {
  const ua = navigator.userAgent;
  const parsed = parseUserAgent(ua);
  const dpr = window.devicePixelRatio || 1;

  return {
    pathname: window.location.pathname,
    href: window.location.href,
    title: document.title,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    screen: `${window.screen.width}×${window.screen.height} @${round(dpr)}x`,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
    colorScheme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    sessionId: sessionId(),
    timeOnPage: getTimeOnPage(),
    pagesVisited: getPagesVisited(),
    consoleErrors: readErrors(),
    appVersion: "",
    userAgent: ua,
  };
}

/**
 * Anonymous, per-tab, no identity attached. It exists to tie several reports
 * from one sitting together, which is the difference between "three bugs" and
 * "one person hit three things in a row".
 */
function sessionId(): string {
  const existing = read("session", SESSION_KEY);
  if (existing) return existing;

  const id = `s_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  write("session", SESSION_KEY, id);
  return id;
}

function round(value: number): string {
  return String(Math.round(value * 10) / 10);
}
