/**
 * Draft persistence (D17).
 *
 * There is no retry queue: if the sink is cold-starting and the request fails,
 * the only thing standing between the reporter and two lost paragraphs is this
 * file. ~2 kB of JSON in sessionStorage.
 *
 * Keyed by pathname on purpose. A draft written on /cennik restoring on
 * /kontakt would show a context strip describing a different page than the text
 * — a quietly wrong report, which is worse than a lost one.
 *
 * sessionStorage rather than localStorage: a half-written complaint about
 * someone's site should not survive the tab on a shared machine.
 */

import type { FeedbackSeverity, FeedbackType } from "../shared/types";
import { readJSON, remove, writeJSON } from "./storage";

export type Draft = {
  type: FeedbackType;
  severity: FeedbackSeverity;
  what: string;
  why: string;
  how: string;
};

const PREFIX = "fb.draft:";

export function draftKey(pathname: string): string {
  return `${PREFIX}${pathname}`;
}

export function readDraft(pathname: string): Draft | null {
  const draft = readJSON<Draft>("session", draftKey(pathname));
  if (!draft) return null;
  // An empty draft is not a draft — it would trigger the restore line for
  // someone who only opened the panel and closed it.
  if (!draft.what?.trim() && !draft.why?.trim() && !draft.how?.trim()) return null;
  return draft;
}

export function writeDraft(pathname: string, draft: Draft): void {
  writeJSON("session", draftKey(pathname), draft);
}

export function clearDraft(pathname: string): void {
  remove("session", draftKey(pathname));
}
