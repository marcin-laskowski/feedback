/**
 * Route handler. Mount it in the consuming app:
 *
 *   // app/api/feedback/route.ts
 *   export { POST, GET } from "@unhyped/feedback/server";
 *   export const maxDuration = 20;   // must be declared in the route file itself
 *
 * Two env vars, both server-side only:
 *   FEEDBACK_SINK_URL    the Apps Script /exec URL
 *   FEEDBACK_SINK_TOKEN  the shared secret from Script Properties
 *
 * Neither may ever reach the browser. That is why the warm-up ping is a GET on
 * THIS route rather than a fetch straight to the sink: the widget cannot know
 * the sink's address.
 */

import {
  MAX_BODY_BYTES,
  MAX_TEXT,
  SCHEMA_VERSION,
  type FeedbackSubmission,
  type SinkPayload,
  type SinkResponse,
  type SubmitResponse,
} from "../shared/types";
import { redactUrl } from "../shared/redact";
import { parseUserAgent } from "../shared/ua";
import { clip, validateReport } from "../shared/validate";

/** Client aborts at 15 s; the route gives the sink 14 s so we own the timeout. */
const SINK_TIMEOUT_MS = 14_000;
const WARMUP_TIMEOUT_MS = 3_000;

/**
 * Rate limit per IP, sliding window, in memory. A review session is bursty —
 * one person walking a site files a dozen reports in an hour — so the ceiling
 * is high. It exists to stop a loop, not to ration honest use. Best-effort on
 * serverless: the window is per instance.
 */
const RL_WINDOW_MS = 60 * 60 * 1000;
const RL_MAX = 30;
const rlHits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rlHits.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (hits.length >= RL_MAX) {
    rlHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  rlHits.set(ip, hits);
  if (rlHits.size > 10_000) rlHits.clear();
  return false;
}

function json(body: SubmitResponse, status: number): Response {
  return Response.json(body, { status });
}

/** Names of the required variables that are missing or empty. */
function missingConfig(): string[] {
  return (["FEEDBACK_SINK_URL", "FEEDBACK_SINK_TOKEN"] as const).filter(
    (name) => !process.env[name]?.trim()
  );
}

function config(): { url: string; token: string } | null {
  const missing = missingConfig();
  if (missing.length) {
    console.error(`[feedback] not set: ${missing.join(", ")}`);
    return null;
  }
  return {
    url: process.env.FEEDBACK_SINK_URL as string,
    token: process.env.FEEDBACK_SINK_TOKEN as string,
  };
}

/**
 * Warm-up ping, and the only health check this system has.
 *
 * Apps Script cold start is 1–3 s and is the entire p95 budget now that there
 * is no second latency mitigation left. The widget fires this when the panel
 * opens and ignores the answer; by the time the user has typed two sentences
 * the container is awake.
 *
 * It reports on the sink rather than on itself, which costs one body read and
 * buys the one thing worth having here: `curl /api/feedback` tells you whether
 * the sink is actually configured. An earlier version returned `{ ok: true }`
 * as long as the fetch resolved — including when Google answered 403 with a
 * login page, which is exactly the failure this endpoint should surface.
 */
export async function GET(): Promise<Response> {
  const cfg = config();
  if (!cfg) {
    // Names, never values. Which variable is missing is the whole question when
    // a deploy answers "unconfigured", and a health check that makes you guess
    // between two candidates is half a health check. Variable names are not
    // secrets — they are in the README.
    return Response.json(
      { ok: false, warm: false, sink: "unconfigured", missing: missingConfig() },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(cfg.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(WARMUP_TIMEOUT_MS),
    });
    const body = await res.text();

    // The sink answers JSON. HTML means Google answered instead of the script.
    if (!res.ok || !body.trimStart().startsWith("{")) {
      console.error(
        `[feedback] sink answered HTTP ${res.status} ${res.headers.get("content-type")} — ` +
          `check that the Apps Script deployment is a Web app with access "Anyone", ` +
          `and that FEEDBACK_SINK_URL ends in /exec`
      );
      return Response.json({ ok: false, warm: false, sink: "unreachable" }, { status: 502 });
    }

    return Response.json({ ok: true, warm: true, sink: "ok" });
  } catch (e) {
    // A cold sink still waking up lands here too, so this is a warning, not a
    // failure of the widget.
    console.error("[feedback] warm-up failed:", e);
    return Response.json({ ok: false, warm: false, sink: "timeout" }, { status: 504 });
  }
}

export async function POST(req: Request): Promise<Response> {
  // Body guard before parsing. A report is ~4 kB; anything near the ceiling is
  // not a report.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json({ ok: false, error: "server" }, 400);
  }
  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, error: "server" }, 413);
  }

  let body: Partial<FeedbackSubmission>;
  try {
    body = JSON.parse(raw) as Partial<FeedbackSubmission>;
  } catch {
    return json({ ok: false, error: "server" }, 400);
  }

  // Honeypot: humans never see the field. Answer 200 so the bot stops trying.
  if (body.website) return json({ ok: true, id: "fb_ignored" }, 200);

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return json({ ok: false, error: "rate_limited" }, 429);

  const invalid = validateReport(body);
  if (invalid.length) return json({ ok: false, error: "validation", fields: invalid }, 400);

  const cfg = config();
  if (!cfg) return json({ ok: false, error: "unavailable" }, 503);

  const ctx = body.context ?? ({} as FeedbackSubmission["context"]);

  // The client's UA parse is what it RENDERED. What we store is what we derive
  // from the raw string ourselves (D18) — the two are the same function, but
  // only one of them is trustworthy.
  const parsed = parseUserAgent(String(ctx.userAgent ?? req.headers.get("user-agent") ?? ""));

  const payload: SinkPayload = {
    token: cfg.token,
    schemaVersion: SCHEMA_VERSION,
    project: clip(body.project, 120),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    country: req.headers.get("x-vercel-ip-country") ?? "",

    // Validated above — the casts are safe and keep the sink payload typed.
    type: body.type as FeedbackSubmission["type"],
    severity: body.severity as FeedbackSubmission["severity"],
    what: clip(body.what, MAX_TEXT),
    why: clip(body.why, MAX_TEXT),
    how: clip(body.how, MAX_TEXT),

    context: {
      pathname: clip(ctx.pathname, 500),
      href: redactUrl(clip(ctx.href, 1000)),
      title: clip(ctx.title, 300),
      viewport: clip(ctx.viewport, 40),
      screen: clip(ctx.screen, 40),
      browser: parsed.browser,
      os: parsed.os,
      device: parsed.device,
      colorScheme: ctx.colorScheme === "dark" ? "dark" : "light",
      language: clip(ctx.language, 40),
      timezone: clip(ctx.timezone, 80),
      sessionId: clip(ctx.sessionId, 60),
      timeOnPage: Number.isFinite(ctx.timeOnPage) ? Math.max(0, Math.round(ctx.timeOnPage)) : 0,
      pagesVisited: (Array.isArray(ctx.pagesVisited) ? ctx.pagesVisited : [])
        .slice(-12)
        .map((p) => clip(p, 200)),
      consoleErrors: (Array.isArray(ctx.consoleErrors) ? ctx.consoleErrors : [])
        .slice(-10)
        .map((e) => clip(e, 400)),
      appVersion: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? clip(ctx.appVersion, 60),
      userAgent: clip(ctx.userAgent, 500),
    },
  };

  let result: SinkResponse;
  try {
    // redirect: "follow" is load-bearing. Apps Script answers 302 and puts the
    // real body at googleusercontent.com; without it we read an empty response,
    // call the write a failure, and the row is already in the sheet.
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: AbortSignal.timeout(SINK_TIMEOUT_MS),
    });

    // Read as text first. When the deployment is misconfigured Google answers
    // with an HTML login page, and `res.json()` throws a parse error that says
    // nothing about the actual problem — which is a deploy setting, not JSON.
    const body = await res.text();
    try {
      result = JSON.parse(body) as SinkResponse;
    } catch {
      console.error(
        `[feedback] sink answered HTTP ${res.status} ${res.headers.get("content-type")} ` +
          `instead of JSON: ${body.slice(0, 120)}`
      );
      return json({ ok: false, error: "unavailable" }, 502);
    }
  } catch (e) {
    console.error("[feedback] sink unreachable:", e);
    return json({ ok: false, error: "unavailable" }, 502);
  }

  if (!result.ok) {
    // `unauthorized` here means OUR token is wrong — a deploy problem, not a
    // user problem. Log it loudly; the user just sees "try again".
    console.error("[feedback] sink rejected:", result.error, result.fields ?? "");
    if (result.error === "validation") {
      return json({ ok: false, error: "validation", fields: result.fields ?? [] }, 400);
    }
    return json({ ok: false, error: "server" }, 502);
  }

  return json({ ok: true, id: result.id }, 200);
}
