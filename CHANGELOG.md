# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semver](https://semver.org/). Consumers install by tag
(`npm i github:marcin-laskowski/feedback#v0.2.2`), so every release needs one.

## [Unreleased]

## [0.2.2] – 2026-10-21

### Fixed

- One stuck write no longer takes the sink down for six minutes. `doPost`
  held a script-wide lock while it opened the sheet, synced the headers and
  appended the row, and waited 10 s to get it. On 2026-10-21 one execution
  stalled inside that window. Apps Script keeps a run alive for up to 6 min
  after its caller has gone, so every report in those minutes waited 10 s,
  failed with a generic `server`, and the panel said "Nie udało się wysłać"
  six times for one report. The lock now covers only the append (plus the
  header sync, when a column is missing), the wait is 3 s, a held lock
  answers `busy` instead of throwing, and the sheet is flushed before the
  lock is released. **`Code.gs` has to be redeployed**: paste it and raise the
  version of the existing deployment.
- The route handler logs what the sink said. A `server` answer now carries
  the stage `doPost` was in and the exception text, every failed call logs
  how long the sink took, and a successful write over 6 s is logged as slow.
  The incident above was six lines of `sink rejected: server` and nothing
  else.
- A sink timeout on the route answers `timeout` (504) instead of
  `unavailable`, and the panel says the send was not confirmed rather than
  that it failed. The Apps Script run outlives the route's 14 s and may still
  write the row.

### Changed

- The panel's error note depends on why the send failed. `busy` says the
  report cannot be taken right now and asks for a retry in a moment,
  `timeout` says there was no confirmation, `rate_limited` and `validation`
  use the sentences that existed for them but were never shown. Every note
  says the text is still in the form ("Tekst masz w formularzu"), not that it
  is "zapisany", which read as delivered.
- The place reports go is "lista zgłoszeń" everywhere a reporter sees it. The
  context strip says "wizyta" instead of "sesja", "Pokaż, co dołączamy do
  zgłoszenia" instead of "Pokaż, co zbieramy", and the error count no longer
  has to agree with a Polish numeral ("wykryte na tej stronie: 5", where
  "5 wykryte" was wrong).
- `busy` from the sink is a 503 with `Retry-After: 10` on the route. Nothing
  was written, so the retry is safe.
- The per-IP rate limit is 15 reports per 5 minutes instead of 30 per hour.
  It is there to stop a loop, and a loop is stopped just as well by the short
  window; a person cannot file 15 in 5 minutes. The panel can now say
  "spróbuj za kilka minut" instead of asking for an hour.

### Added

- `apps-script/README.md` has a section on what to look at when reports fail
  with `busy` or `server`: the Executions panel, the host's log, and the
  sheet.

- `apps-script/README.md` documents how to update a script that is already
  live: raise the version of the existing deployment instead of creating a new
  one, read the Deployment column in Executions to see which version a site is
  hitting, and either raise that deployment's version or point the site's
  `FEEDBACK_SINK_URL` at the updated one. Written after the 0.2.0 update, where
  a second deployment got the new code while the site kept calling the first.

### Fixed

- The `curl` example for a full submission no longer uses `-X POST`. Combined
  with `-L` it forces a POST on Google's redirect target and returns an HTML
  405 page instead of the script's JSON.

## [0.2.1] – 2026-10-02

### Fixed

- iOS Safari no longer zooms the page in when a field in the panel is tapped.
  Safari zooms into any input under 16 px on focus and does not zoom back out;
  on touch screens (`pointer: coarse`) the fields are now 16 px. The desktop
  keeps 14 px. The host page cannot fix this for the widget, because its CSS
  does not cross the shadow root.

## [0.2.0] – 2026-10-02

### Changed

- The widget now carries the Unhyped design system (unhyped.ai `tokens.css`):
  warm monochrome instead of blue, Geist and Geist Mono taken from the host's
  `--font-geist` / `--font-geist-mono` variables (system stack elsewhere), sharp
  corners everywhere, hairline frames instead of shadows, one ease and two
  durations. Hover changes colour or border only, nothing moves or lifts. The
  primary button gets the site's arrow swap; the context strip reads in the
  eyebrow register; notes are lines of text, not boxes; success is the contact
  form's check-mark block. The dark scheme maps to the site's dark tone.
- The trigger is a tab pinned to the right edge of the viewport, vertically
  centred: a 40 px ink square with the icon at rest, the label slides out to
  the left on hover and on keyboard focus. The panel opens beside it on the
  same axis. On mobile it is still a bottom sheet.

### Added

- The form asks who is reporting ("Kto zgłasza?") in place of the type chips.
  The name is required, travels as `reporter`, lands in a new `reporter`
  column, and is remembered in `localStorage` so it is typed once per browser.
- `Code.gs` appends any column an existing sheet is missing (`syncHeaders_`),
  so the new column shows up after a redeploy without editing the sheet by
  hand. **The Apps Script has to be redeployed for the name to be stored.**

### Removed

- Dragging the trigger, and the stored position that came with it. A tab on
  the edge does not cover content, which is what dragging was for.
- The "Jak bardzo przeszkadza?" (severity) and "Czego dotyczy?" (type) fields.
  The sink still requires both columns, so every report carries `annoying` and
  `bug` until the contract changes.

## [0.1.2] – 2026-08-05

### Changed

- The trigger is back to 44 px tall with a 14 px label and a 16 px icon, up
  from 38/13/15. The smaller pill was tuned for restraint and lost the
  argument: it sits on somebody else's site with no onboarding behind it, and a
  control nobody notices is a control nobody uses. Its open padding is 14 px so
  the pill collapses into an exact 44 px circle rather than an ellipse a few
  pixels off square.

## [0.1.1] – 2026-08-05

### Added

- The trigger is draggable, remembers where it was put, and re-clamps on
  resize. Wherever a trigger defaults to, it eventually covers the thing a
  reporter wants to point at.
- Motion: the panel scales out of the corner it shares with the trigger over
  280 ms and leaves in 150 ms on a different curve, the mobile sheet slides,
  and reduced motion keeps the fades and drops the rest.
- The trigger collapses into a neutral circle holding an ✕ when the panel is
  open, through a grid column animating from `1fr` to `0fr` – the one way to
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
  function is not listed in the editor's Run dropdown – so the setup step the
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
  while the form is untouched – once there is text in it, the report belongs to
  the page it was started on.
- The gap between the trigger's icon and label is a margin on the collapsing
  element rather than padding inside it. Padding in a box squeezed to zero
  width cannot go below the padding itself, so it survived the collapse as
  7 px to the right of the ✕, pushing the circle off centre and out of line
  with the panel.

## [0.1.0] – 2026-08-05

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
- Context strip as an expandable disclosure – everything stored is visible in
  the reporter's own language, which is what makes the transparency claim true.
- Draft persistence in `sessionStorage`, keyed by pathname, with a restore
  notice and a one-click discard.
- Deep link `?feedback=open`, stripped from the URL with `history.replaceState`
  after it opens the panel.
- `reveal="invited"` – the trigger stays hidden until someone arrives on the
  deep link.
- Console error buffer (`<FeedbackErrorInit />`), cleared on navigation.
- Shared contract in `src/shared/`: types, validation, UA parsing, redaction,
  and every user-visible string.

### Notes

- No screenshot capture, no retry queue, no idempotency key. See the accepted
  limits table in the README.
