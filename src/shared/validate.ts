/**
 * One validator, two callers. The client runs it before enabling send so the
 * user gets a highlighted field; the server runs it so a crafted request can't
 * skip it. Both must agree with the sink — Code.gs rejects any of
 * type/severity/what/why shorter than 3 characters after trim, and a mismatch
 * here means the user sees a server error instead of a field error.
 */

import {
  FEEDBACK_SEVERITIES,
  FEEDBACK_TYPES,
  MAX_TEXT,
  type FeedbackSeverity,
  type FeedbackSubmission,
  type FeedbackType,
} from "./types";

/** Fields the sink requires. `how` is optional by design. */
export const REQUIRED_FIELDS = ["type", "severity", "what", "why"] as const;
export type RequiredField = (typeof REQUIRED_FIELDS)[number];

const MIN_LENGTH = 3;

export function isFeedbackType(value: unknown): value is FeedbackType {
  return typeof value === "string" && (FEEDBACK_TYPES as readonly string[]).includes(value);
}

export function isFeedbackSeverity(value: unknown): value is FeedbackSeverity {
  return typeof value === "string" && (FEEDBACK_SEVERITIES as readonly string[]).includes(value);
}

/**
 * Returns the names of invalid fields, empty array when the report is sendable.
 * Order matches REQUIRED_FIELDS so the caller can focus the first bad field.
 */
export function validateReport(input: Partial<FeedbackSubmission>): RequiredField[] {
  const invalid: RequiredField[] = [];

  if (!isFeedbackType(input.type)) invalid.push("type");
  if (!isFeedbackSeverity(input.severity)) invalid.push("severity");
  if (!hasMinText(input.what)) invalid.push("what");
  if (!hasMinText(input.why)) invalid.push("why");

  return invalid;
}

function hasMinText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length >= MIN_LENGTH;
}

/** Collapses newlines out of single-line values and clips to the sink's limit. */
export function clip(value: unknown, max: number = MAX_TEXT): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}
