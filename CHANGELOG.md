# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semver](https://semver.org/). Consumers install by tag
(`npm i github:marcin-laskowski/feedback#v0.1.0`), so every release needs one.

## [Unreleased]

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
