/**
 * Storage that never throws. Safari in private mode and locked-down corporate
 * profiles both make `sessionStorage` access throw rather than return null, and
 * a feedback widget is the last thing that should take a page down.
 */

type Kind = "session" | "local";

function store(kind: Kind): Storage | null {
  try {
    const s = kind === "session" ? window.sessionStorage : window.localStorage;
    // Touch it — the throw happens on access, not on the property read.
    s.getItem("__fb_probe__");
    return s;
  } catch {
    return null;
  }
}

export function read(kind: Kind, key: string): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function write(kind: Kind, key: string, value: string): void {
  try {
    store(kind)?.setItem(key, value);
  } catch {
    // Quota or private mode. The draft is a convenience, not a guarantee.
  }
}

export function remove(kind: Kind, key: string): void {
  try {
    store(kind)?.removeItem(key);
  } catch {
    // ignore
  }
}

export function readJSON<T>(kind: Kind, key: string): T | null {
  const raw = read(kind, key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJSON(kind: Kind, key: string, value: unknown): void {
  try {
    write(kind, key, JSON.stringify(value));
  } catch {
    // ignore
  }
}
