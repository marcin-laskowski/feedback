# Apps Script sink — setup & verification

M0 of the feedback widget. Goal: a `curl` command appends a correctly escaped row to a Sheet. Nothing else in the plan matters until this works.

**Time: ~30 min.**

---

## 1. Create the sheet

New Google Sheet, name it whatever. Copy the ID from the URL:

```
https://docs.google.com/spreadsheets/d/<THIS_PART>/edit
```

Don't create headers by hand — `setup_()` writes them, in the exact order `Code.gs` expects.

## 2. Create the script

[script.google.com](https://script.google.com) → New project. Paste `Code.gs`. Name the project `unhyped-feedback-sink`.

**Project Settings → Script Properties**, add three:

| Property | Value |
|---|---|
| `SHEET_ID` | the ID from step 1 |
| `FEEDBACK_TOKEN` | a long random string — `openssl rand -hex 24` |
| `SHEET_TAB` | `reports` (optional, this is the default) |

Optionally `DEPLOYMENT_VERSION` — a short label written into every row, so you can tell which script version produced a report.

## 3. Initialise

In the editor, select `setup_` and run it. Authorise when prompted (it's your own script touching your own sheet).

Check the log: headers written, token present. Look at the sheet — row 1 bold and frozen, 32 columns.

Then run `testLocal_`. A row should appear. **Check cell H2** — it must read `'=IMPORTXML(...)` with a leading apostrophe, displayed as text. If Sheets evaluated it instead, stop and fix the escape before going further.

Check `page_url` too: `token=SECRET123` must have become `token=[redacted]`, while `utm_source=nl` survives intact.

## 4. Deploy

**Deploy → New deployment → Web app**

| Setting | Value |
|---|---|
| Execute as | **Me** |
| Who has access | **Anyone** |

"Anyone" is required — the caller is a Vercel function with no Google identity. The endpoint is protected by `FEEDBACK_TOKEN`, not by Google auth, which is why the URL and the token both have to stay server-side.

Copy the `/exec` URL. Together with the token, these are the two environment variables the Next.js route handler needs:

```bash
FEEDBACK_SINK_URL=https://script.google.com/macros/s/AKfy…/exec
FEEDBACK_SINK_TOKEN=…
```

## 5. Verify with curl

Warm-up ping (this is what the widget fires when the panel opens):

```bash
curl -sL "$FEEDBACK_SINK_URL"
# {"ok":true,"warm":true,"schemaVersion":1,"deployment":"dev"}
```

Full submission:

```bash
curl -sL -X POST "$FEEDBACK_SINK_URL" \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "'"$FEEDBACK_SINK_TOKEN"'",
    "schemaVersion": 1,
    "project": "curl-test",
    "environment": "development",
    "type": "bug",
    "severity": "blocker",
    "what": "Cennik nie ładuje się po kliknięciu Zobacz plany",
    "why": "Nie mogę pokazać oferty klientowi na jutrzejszym spotkaniu.",
    "how": "Może wystarczy poprawić link.",
    "context": {
      "pathname": "/cennik",
      "href": "https://example.com/cennik?utm_source=nl",
      "title": "Cennik — Acme",
      "viewport": "1440×900",
      "screen": "2560×1440 @2x",
      "browser": "Chrome 141",
      "os": "macOS 15",
      "device": "desktop",
      "colorScheme": "light",
      "language": "pl-PL",
      "timezone": "Europe/Warsaw",
      "sessionId": "s_abc123",
      "timeOnPage": 47,
      "pagesVisited": ["/", "/cennik"],
      "consoleErrors": ["TypeError: plans is undefined at pricing.js:88"],
      "appVersion": "a1b2c3d",
      "userAgent": "Mozilla/5.0 …"
    }
  }'
# {"ok":true,"id":"fb_…","deployment":"dev"}
```

**`-L` is not optional.** Apps Script answers with a 302 to `googleusercontent.com` and the real body is at the redirect target. A client that doesn't follow redirects reads an empty response, concludes the write failed, retries — and duplicates the row. The Next.js handler must use `redirect: 'follow'` for the same reason.

### Cases that must also behave

```bash
# wrong token   → {"ok":false,"error":"unauthorized"}
# missing why   → {"ok":false,"error":"validation","fields":["why"]}
# invalid JSON  → {"ok":false,"error":"bad_json"}
```

## 6. Prepare the client-facing view

The `notes` column is yours. The CEO review made the sheet a shared board, which means the client will read it — including anything you write there.

Before sharing, add a second tab, `board`, with one formula in A1:

```
=QUERY(reports!A:AF; "select A, B, E, F, G, H, K, AE where A is not null order by B desc"; 1)
```

Columns: id, date, type, severity, what, why, page, status. No `notes`, no console errors, no session IDs. Share **that** tab — right-click → Protect sheet on `reports`, or share the whole file read-only and accept that everything is visible.

That view is what the CEO review calls closing the loop. It's the entire return path, and it costs one formula.

---

## Version control

The script must not live only in a browser tab. Once it works:

```bash
npm i -g @google/clasp
clasp login
clasp clone <SCRIPT_ID>       # Project Settings → Script ID
clasp push                    # after every edit
clasp deploy -i <DEPLOYMENT_ID> -d "…"   # updates the existing /exec URL
```

`clasp deploy` with `-i` keeps the same URL. Creating a *new* deployment gives you a new URL and silently orphans every site pointing at the old one.

Commit `Code.gs`, `appsscript.json`, and this README to `/apps-script` in the widget repo. Never commit the token or the sheet ID — they live in Script Properties.

---

## Known limits, accepted for M1

| Limit | Why it's fine now |
|---|---|
| No rate limiting | Three known reporters on one site. Honeypot in the Next handler. Add `CacheService` when it goes public. |
| No idempotency | Submit is synchronous with no auto-retry, and `-L`/`redirect: 'follow'` removes the duplicate-row cause. |
| No `schemaVersion` negotiation | The field is stored; nothing branches on it yet. One consumer. |
| Cold start 1–3 s | The warm-up ping on panel open covers it. Measure it in M1 before optimising further. |
| Apps Script quotas | ~20k URL-fetch calls/day, 90 min/day runtime. Orders of magnitude above realistic volume. |

## Next

`shared/types.ts` and `shared/validate.ts` first — the payload shape above is the contract, and both sides should compile against it before any UI exists.
