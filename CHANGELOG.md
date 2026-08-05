# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semver](https://semver.org/). Consumers install by tag
(`npm i github:marcin-laskowski/feedback#v0.1.0`), so every release needs one.

## [Unreleased]

### Fixed

- `setup_()` and `testLocal_()` renamed to `setup()` and `testLocal()`. A
  trailing underscore marks a function as private in Apps Script, and a private
  function is not listed in the editor's Run dropdown — so the setup step the
  README told you to run could not be run at all. Everything downstream of it
  (headers, authorisation, the escape check) silently never happened.

- The warm-up `GET` reported on itself rather than on the sink: it answered
  `{ ok: true }` as long as the fetch resolved, including when Google returned
  403 and a login page because the Apps Script deployment was not set to
  "Anyone". It now reads the body, requires JSON, and answers
  `{ sink: "ok" | "unreachable" | "timeout" | "unconfigured" }`. `curl` on the
  route is now a real health check.
- A misconfigured deployment surfaced as `SyntaxError: Unexpected token '<'`
  from `res.json()`, which describes the symptom and not the cause. The POST
  path now reads text first and logs the status, content type, and the start of
  the body, with the deploy setting to check.

## [0.1.0] — 2026-08-05

First release. M1 scope.

### Added

- Apps Script sink: `doPost` with token check, `LockService` around the append,
  header-name column mapping, formula escaping, query-value redaction.
- Warm-up `doGet`, proxied through the host app's route handler so the sink URL
  stays server-side.
- Route handler (`@unhyped/feedback/server`): honeypot, per-IP sliding-window
  rate limit, shared validation, server-side UA re-derivation, URL redaction,
  and injection of environment, country, and commit SHA.
- Widget (`@unhyped/feedback/client`): shadow-DOM mount in a second React root,
  trigger with two breakpoint-dependent close affordances, panel with the
  what / why / how fields plus type and severity pills.
- Context strip as an expandable disclosure — everything stored is visible in
  the reporter's own language, which is what makes the transparency claim true.
- Draft persistence in `sessionStorage`, keyed by pathname, with a restore
  notice and a one-click discard.
- Deep link `?feedback=open`, stripped from the URL with `history.replaceState`
  after it opens the panel.
- `reveal="invited"` — the trigger stays hidden until someone arrives on the
  deep link.
- Console error buffer (`<FeedbackErrorInit />`), cleared on navigation.
- Shared contract in `src/shared/`: types, validation, UA parsing, redaction,
  and every user-visible string.

### Notes

- No screenshot capture, no retry queue, no idempotency key. See the accepted
  limits table in the README.
