"use client";

/**
 * Starts the console error buffer and the navigation tracker.
 *
 * Mount this in the root layout, above everything else. It is a separate
 * component from the widget on purpose: the buffer has to be listening before
 * the errors happen. If it only started when the panel opened, every report
 * would carry the errors that occurred AFTER the user noticed the problem.
 *
 * The module-level call below runs when the chunk loads, which is earlier than
 * any effect; the effect is the fallback for a re-mount.
 */

import { useEffect } from "react";
import { initErrorBuffer } from "./errorBuffer";

if (typeof window !== "undefined") initErrorBuffer();

export function FeedbackErrorInit() {
  useEffect(() => {
    initErrorBuffer();
  }, []);
  return null;
}
