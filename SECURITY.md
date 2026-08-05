# Security

## Reporting a vulnerability

Email **marcin@laskowski.ai**. Please do not open a public issue for anything
that could be exploited before it is fixed.

Expect a reply within a few working days. There is no bounty programme.

## What is a secret and what is not

This repository is public on purpose. The design of the sink is not the secret:

| Public | Secret |
|---|---|
| `apps-script/Code.gs` — the whole sink | `FEEDBACK_TOKEN` (Apps Script Script Properties) |
| The payload contract in `src/shared/` | `FEEDBACK_SINK_URL` (the `/exec` deployment URL) |
| The column list and the redaction denylist | `SHEET_ID` (Script Properties) |

The Apps Script web app is deployed with access **Anyone**, because the caller
is a serverless function with no Google identity. It is protected by the shared
token that travels in the request body — Apps Script does not expose custom
request headers to `doPost`, so there is nowhere else to put it.

That makes two rules absolute:

1. **The token and the sink URL never reach the browser.** They are read from
   the environment inside the route handler and nowhere else. This is also why
   the warm-up ping is a `GET` on your own route rather than a fetch at the
   sink.
2. **Neither is ever committed.** They live in Script Properties and in the host
   platform's environment variables.

## Known exposure of the unauthenticated `doGet`

`doGet` answers any caller with `{ ok: true, warm: true, schemaVersion, deployment }`.
Someone who guesses a deployment URL learns that a feedback sink exists and what
its deployment label is. It writes nothing and reads nothing. Rotate the token
if the URL leaks; rotating the URL means redeploying and updating every site
that points at it.

## Handling the sheet

The sheet is the sensitive artifact, not the code. It carries page paths,
console errors, and free text written by people who may not be careful about
what they paste into a text box.

- Share the `board` view, not `reports`. `notes` and `console_errors` are not in
  it by design.
- Protect the `reports` tab. Renaming a header there silently empties that
  column for every future report.
