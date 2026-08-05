/**
 * Console error buffer.
 *
 * This has to be installed as early as the app can install it, which is why it
 * ships as its own component (`<FeedbackErrorInit />` in the root layout)
 * rather than living inside the widget. If it only started collecting when the
 * panel opened it would capture the errors that happen AFTER the user noticed
 * the bug — that is, the useless ones.
 *
 * The buffer is per-page: the context strip says "wykryte na tej stronie", so
 * a navigation clears it. Anything else would make that line a lie.
 */

import { initNav, onLocationChange } from "./nav";

const MAX_ENTRIES = 10;
const MAX_LENGTH = 400;

let buffer: string[] = [];
let installed = false;

export function initErrorBuffer(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const original = console.error;
  console.error = (...args: unknown[]) => {
    push(format(args));
    original.apply(console, args as Parameters<typeof console.error>);
  };

  window.addEventListener("error", (event) => {
    const where = event.filename ? ` (${basename(event.filename)}:${event.lineno})` : "";
    push(`${event.message}${where}`);
  });

  window.addEventListener("unhandledrejection", (event) => {
    push(`Unhandled rejection: ${format([event.reason])}`);
  });

  initNav();
  onLocationChange(clearErrors);
}

export function readErrors(): string[] {
  return buffer.slice();
}

export function clearErrors(): void {
  buffer = [];
}

function push(entry: string): void {
  const text = entry.trim().slice(0, MAX_LENGTH);
  if (!text) return;
  // Repeated identical errors (a render loop) would fill the buffer and push
  // out everything useful. Keep the first, drop the echoes.
  if (buffer[buffer.length - 1] === text) return;
  buffer.push(text);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

function format(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

function basename(url: string): string {
  return url.split("/").pop() ?? url;
}
