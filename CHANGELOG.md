# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semver](https://semver.org/). Consumers install by tag
(`npm i github:marcin-laskowski/feedback#v0.1.2`), so every release needs one.

## [Unreleased]

## [0.1.2] — 2026-08-05

### Changed

- The trigger is back to 44 px tall with a 14 px label and a 16 px icon, up
  from 38/13/15. The smaller pill was tuned for restraint and lost the
  argument: it sits on somebody else's site with no onboarding behind it, and a
  control nobody notices is a control nobody uses. Its open padding is 14 px so
  the pill collapses into an exact 44 px circle rather than an ellipse a few
  pixels off square.

## [0.1.1] — 2026-08-05

### Added

- The trigger is draggable, remembers where it was put, and re-clamps on
  resize. Wherever a trigger defaults to, it eventually covers the thing a
  reporter wants to point at.
- Motion: the panel scales out of the corner it shares with the trigger over
  280 ms and leaves in 150 ms on a different curve, the mobile sheet slides,
  and reduced motion keeps the fades and drops the rest.
- The trigger collapses into a neutral circle holding an ✕ when the panel is
  open, through a grid column animating from `1fr` to `0fr` — the one way to
  transition a width set by its own content.

### Changed

- The panel docks an edge to the trigger instead of centring on it, choosing
  the edge from the half of the screen the trigger was dragged to, so it always
  opens away from the nearest wall.
- The default resting place is the bottom-right corner at a 28 px margin, while
  the drag limit stays 16 px.
- "Jak to widzisz? (opcjonalnie)" is gone. Two questions carry a report; the
  third mostly collected empty strings. The column stays in the sheet and the
  field stays in the contract as optional.

### Fixed

- `setup_()` and `testLocal_()` renamed to `setup()` and `testLocal()`. A
  trailing underscore marks a function as private in Apps Script, and a private
  function is not listed in the editor's Run dropdown — so the setup step the
  README told you to run could not be run at all. Everything downstream of it
  (headers, authorisation, the escape check) silently never happened, and the
  missing authorisation surfaced as a 403 on the deployment, which reads like a
  sharing-policy problem and sends you looking in the wrong place entirely.
- The warm-up `GET` reported on itself rather than on the sink: it answered
  `{ ok: true }` as long as the fetch resolved, including when Google returned
  403 and a login page. It now reads the body, requires JSON, and answers
  `{ sink: "ok" | "unreachable" | "timeout" | "unconfigured" }`. `curl` on the
  route is a real health check.
- A misconfigured deployment surfaced as `SyntaxError: Unexpected token '<'`
  from `res.json()`, which describes the symptom and not the cause. The POST
  path now reads text first and logs the status, content type, and the start of
  the body, with the deploy setting to check.
- The panel stays mounted for one animation after closing, instead of vanishing
  mid-air.
- The panel re-reads its context when the page changes underneath it, but only
  while the form is untouched — once there is text in it, the report belongs to
  the page it was started on.
- The gap between the trigger's icon and label is a margin on the collapsing
  element rather than padding inside it. Padding in a box squeezed to zero
  width cannot go below the padding itself, so it survived the collapse as
  7 px to the right of the ✕, pushing the circle off centre and out of line
  with the panel.

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
