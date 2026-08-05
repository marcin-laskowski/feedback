/**
 * URL redaction (D20).
 *
 * The sink does this too — see `redactUrl_` in Code.gs. Doing it here as well
 * is deliberate: it means a token in a query string never reaches Google at
 * all, and the two lists have to stay identical. If you add a param here, add
 * it there in the same commit.
 *
 * Param NAMES survive so the report stays diagnosable; only values are
 * replaced. `?feedback=open` is dropped outright rather than redacted — it is
 * our own param, it is never part of the page being reported on, and leaving
 * it in would pollute every report that arrived through the deep link.
 */

/** Values replaced with [redacted]. Must match PARAM_DENYLIST in Code.gs. */
export const PARAM_DENYLIST = [
  "token",
  "key",
  "secret",
  "password",
  "pwd",
  "code",
  "email",
  "session",
  "auth",
  "signature",
  "access_token",
  "id_token",
] as const;

/** Params removed entirely — ours, not the page's. */
export const PARAM_DROPLIST = ["feedback"] as const;

const REDACTED = "[redacted]";

export function redactUrl(url: string): string {
  if (!url) return "";

  const queryStart = url.indexOf("?");
  if (queryStart === -1) return url;

  const base = url.slice(0, queryStart);
  let rest = url.slice(queryStart + 1);

  let hash = "";
  const hashStart = rest.indexOf("#");
  if (hashStart !== -1) {
    hash = rest.slice(hashStart);
    rest = rest.slice(0, hashStart);
  }

  const kept = rest
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return pair;
      const name = pair.slice(0, eq);
      const lower = name.toLowerCase();
      if ((PARAM_DROPLIST as readonly string[]).includes(lower)) return null;
      if ((PARAM_DENYLIST as readonly string[]).includes(lower)) return `${name}=${REDACTED}`;
      return pair;
    })
    .filter((pair): pair is string => pair !== null);

  if (kept.length === 0) return base + hash;
  return `${base}?${kept.join("&")}${hash}`;
}

/**
 * Removes our deep-link param from a query string, for `history.replaceState`.
 * Returns the search string including "?", or "" when nothing is left.
 */
export function stripDeepLinkParam(search: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return "";

  const kept = raw.split("&").filter((pair) => {
    const name = pair.split("=")[0]?.toLowerCase() ?? "";
    return !(PARAM_DROPLIST as readonly string[]).includes(name);
  });

  return kept.length ? `?${kept.join("&")}` : "";
}
