/**
 * Location tracking without a router.
 *
 * The widget mounts into a second React root outside Next's provider tree, so
 * `usePathname` and friends do not exist here (D19). `popstate` alone is not
 * enough either — it does not fire for `pushState`, which is exactly how an
 * App Router navigation happens. So we patch the two history methods and emit.
 */

import { readJSON, writeJSON } from "./storage";

type Listener = (pathname: string) => void;

const VISITED_KEY = "fb.visited";
const MAX_VISITED = 12;

const listeners = new Set<Listener>();
let installed = false;
let enteredAt = 0;

export function initNav(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  enteredAt = Date.now();
  recordVisit(window.location.pathname);

  for (const key of ["pushState", "replaceState"] as const) {
    const original = window.history[key];
    window.history[key] = function patched(this: History, ...args: unknown[]) {
      const result = (original as (...a: unknown[]) => unknown).apply(this, args);
      // Let the browser settle the new URL before we read it.
      queueMicrotask(emit);
      return result;
    } as History[typeof key];
  }

  window.addEventListener("popstate", emit);
}

export function onLocationChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Pathnames seen this session, oldest first, consecutive duplicates collapsed. */
export function getPagesVisited(): string[] {
  return readJSON<string[]>("session", VISITED_KEY) ?? [];
}

/** Seconds since the current pathname was entered. */
export function getTimeOnPage(): number {
  if (!enteredAt) return 0;
  return Math.max(0, Math.round((Date.now() - enteredAt) / 1000));
}

function emit(): void {
  const pathname = window.location.pathname;
  const visited = getPagesVisited();
  if (visited[visited.length - 1] === pathname) return;

  enteredAt = Date.now();
  recordVisit(pathname);
  for (const listener of listeners) listener(pathname);
}

function recordVisit(pathname: string): void {
  const visited = getPagesVisited();
  if (visited[visited.length - 1] === pathname) return;
  visited.push(pathname);
  writeJSON("session", VISITED_KEY, visited.slice(-MAX_VISITED));
}
