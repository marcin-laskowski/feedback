/**
 * The widget's entire stylesheet, injected into the shadow root.
 *
 * Shadow DOM is what lets this be a flat token block with generic class names:
 * nothing here can reach the host page and nothing on the host page can reach
 * in. The widget therefore carries its own copy of the Unhyped design system
 * (unhyped.ai `tokens.css`: warm monochrome, sharp corners, no shadows, one
 * ease) rather than inheriting the host's cascade. The one thing it does take
 * from the host is the font variables `--font-geist` / `--font-geist-mono`,
 * which custom properties carry across the shadow boundary - on unhyped.ai the
 * widget renders in Geist, anywhere else it falls back to the system stack.
 *
 * Token names are role names, as in the site: ink / muted / faint for text,
 * paper / tint for surfaces, hairline / hairline-2 for frames / separators.
 */

export const CSS = `
:host {
  /* Text ladder - three steps (tokens.css). */
  --fb-ink: #0f0f0f;
  --fb-muted: #5a5855;
  --fb-faint: #76716c;
  /* Surfaces */
  --fb-paper: #ffffff;
  --fb-tint: #f7f5f2;
  /* Lines: hairline = frames (panel, fields, chips), hairline-2 = separators. */
  --fb-hairline: rgba(28, 26, 25, 0.12);
  --fb-hairline-2: rgba(28, 26, 25, 0.07);
  /* Sand - the wash (link hover) and the decorative line (link underline). */
  --fb-sand-200: #e9e5e1;
  --fb-sand-400: #b5ada5;
  /* Primary action = ink on paper. No accent colour: the brand is monochrome
     and the trigger stands out by being the one solid ink block on the page. */
  --fb-primary: #0f0f0f;
  --fb-primary-hover: #2b2927;
  --fb-on-primary: #ffffff;
  /* A hairline ring around the trigger so it keeps an edge on the site's dark
     (ink) sections. Invisible on paper, present on ink. */
  --fb-primary-ring: rgba(255, 255, 255, 0.16);
  /* Dusty brick - errors, never decorative. */
  --fb-alert: #8f3e3e;
  /* Motion: one ease, two durations (tokens.css --ease-out / --dur-*). */
  --fb-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --fb-dur-fast: 180ms;
  --fb-dur-base: 360ms;
  --fb-font: var(--font-geist, system-ui, -apple-system, "Segoe UI", sans-serif);
  --fb-mono: var(--font-geist-mono, ui-monospace, "SF Mono", Menlo, monospace);

  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  font-family: var(--fb-font);
  color: var(--fb-ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Dark scheme = the site's dark tone: ink background, white on an alpha
   scale, the primary button inverts to paper with ink text. */
@media (prefers-color-scheme: dark) {
  :host {
    --fb-ink: rgba(255, 255, 255, 0.92);
    --fb-muted: rgba(255, 255, 255, 0.72);
    --fb-faint: rgba(255, 255, 255, 0.5);
    --fb-paper: #1c1a19;
    --fb-tint: rgba(255, 255, 255, 0.06);
    --fb-hairline: rgba(255, 255, 255, 0.12);
    --fb-hairline-2: rgba(255, 255, 255, 0.09);
    --fb-sand-200: rgba(255, 255, 255, 0.1);
    --fb-sand-400: rgba(255, 255, 255, 0.32);
    --fb-primary: #ffffff;
    --fb-primary-hover: rgba(255, 255, 255, 0.92);
    --fb-on-primary: #0f0f0f;
    --fb-primary-ring: rgba(28, 26, 25, 0.16);
    --fb-alert: #d08c85;
  }
}

*, *::before, *::after { box-sizing: border-box; }

button, input, textarea {
  font: inherit;
  color: inherit;
  margin: 0;
}

/* Focus reads the primary text colour (reset.css). */
:focus-visible {
  outline: 2px solid var(--fb-ink);
  outline-offset: 3px;
  border-radius: 2px;
}

/* Pointer users get no ring at all - Safari hands buttons :focus after a
   click, which is where a stacked-rings look came from in the first place. */
.fb-fab:focus:not(:focus-visible) { outline: none; }

/* ---------------------------------------------------------------- trigger */

/* A tab on the right edge of the viewport, vertically centred - the Vercel
   pattern. At rest it is a 40 px ink square holding the icon; on hover and on
   keyboard focus the label slides out to the left. Sharp and flat like every
   button on the site (contract 6), a touch taller than the site's 34 px
   button because it floats over the page with no onboarding behind it.

   'translate' centres it; 'transform' stays free for nothing - the trigger
   never moves (hover contract). */
.fb-fab {
  position: fixed;
  right: 0;
  top: 50%;
  translate: 0 -50%;
  height: 40px;
  /* 11 + 16 icon + 11 + 2 border = 40, an exact square at rest. */
  padding: 0 11px;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--fb-primary-ring);
  border-right: 0;
  border-radius: 0;
  background: var(--fb-primary);
  color: var(--fb-on-primary);
  font-size: 14px;
  font-weight: 400;
  letter-spacing: -0.005em;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--fb-dur-fast) var(--fb-ease),
    color var(--fb-dur-fast) var(--fb-ease),
    border-color var(--fb-dur-fast) var(--fb-ease);
}

/* Hover = background only (primary's contract). Nothing moves, nothing lifts. */
.fb-fab:hover { background: var(--fb-primary-hover); }
.fb-fab svg { display: block; flex: none; }

/* Open: the tab drops to the secondary register (paper, hairline) and holds
   an ✕. Once the panel is up the trigger is no longer the thing asking for
   attention - the form is. Secondary hover = border only. */
.fb-fab[data-open="true"] {
  background: var(--fb-paper);
  border-color: var(--fb-hairline);
  color: var(--fb-ink);
}

.fb-fab[data-open="true"]:hover { background: var(--fb-paper); border-color: var(--fb-ink); }

/* The label is a grid column animating from 0fr to 1fr - the one way to
   transition an intrinsic width, so the square grows into a bar instead of
   snapping between two shapes. The tab is pinned to the right edge, so the
   growth happens leftwards, away from the wall.

   The gap between icon and text is a MARGIN on the collapsing element, not
   padding on the text inside it: padding inside a box squeezed to zero width
   cannot go below the padding itself and would survive the collapse. */
.fb-fab__label {
  display: grid;
  grid-template-columns: 0fr;
  margin-left: 0;
  opacity: 0;
  transition:
    grid-template-columns var(--fb-dur-base) var(--fb-ease),
    margin-left var(--fb-dur-base) var(--fb-ease),
    opacity var(--fb-dur-fast) var(--fb-ease);
}

.fb-fab__label > span {
  overflow: hidden;
  white-space: nowrap;
  /* Air after the text, inside the collapsing column so it vanishes with it. */
  padding-right: 3px;
}

/* Anything revealed on hover also reveals on :focus-visible (a11y rule). */
.fb-fab:hover .fb-fab__label,
.fb-fab:focus-visible .fb-fab__label {
  grid-template-columns: 1fr;
  margin-left: 8px;
  opacity: 1;
}

/* --------------------------------------------------------------- backdrop */

/* Mobile only. On desktop the panel sits beside the page the user is
   reviewing - dimming it would hide the thing they are reporting on. */
.fb-backdrop { display: none; }

/* ------------------------------------------------------------------ panel */

/* Anchored beside the tab: 40 px of trigger plus 16 px of air from the right
   edge, centred on the same axis. On mobile the media query below wins and
   the panel is a bottom sheet.

   A card, not a floating slab: paper, one hairline frame, sharp corners, no
   shadow (shadows are banned site-wide). 'translate' does the centring so the
   enter/exit keyframes keep 'transform' to themselves. */
.fb-panel {
  position: fixed;
  right: 56px;
  top: 50%;
  translate: 0 -50%;
  transform: none;
  width: 380px;
  max-height: min(640px, 100dvh - 32px);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  background: var(--fb-paper);
  border: 1px solid var(--fb-hairline);
  border-radius: 0;
  overflow: hidden;
  animation: fb-in var(--fb-dur-base) var(--fb-ease);
}

/* Motion follows the site's one rule: from below, one ease, no scaling. The
   last keyframe is "none", which is also what the inline transform is, so
   nothing snaps when the animation hands back control. */
@keyframes fb-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}

/* Leaving is shorter and shallower than arriving. A panel that dismisses at
   the same pace it appeared feels reluctant. */
.fb-panel[data-closing="true"] {
  animation: fb-out var(--fb-dur-fast) var(--fb-ease) forwards;
  pointer-events: none;
}

@keyframes fb-out {
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: translateY(6px); }
}

.fb-titlebar { display: none; }

.fb-handle { display: none; }

/* ------------------------------------------------------------------- body */

.fb-body {
  flex: 1;
  overflow-y: auto;
  /* Without this the widget's scroll chains to the host page: on mobile the
     client's site scrolls away behind the sheet while they are mid-sentence. */
  overscroll-behavior: contain;
  padding: 16px 20px 20px;
}

.fb-field + .fb-field { margin-top: 16px; }

/* Label register = the contact form's (.lform__label): small, semibold, ink. */
.fb-label {
  display: block;
  font-size: 14px;
  line-height: 1.5;
  font-weight: 600;
  margin-bottom: 8px;
}

/* Fields = the contact form's (.lform__input): sharp, hairline, ink on focus. */
.fb-input {
  display: block;
  width: 100%;
  min-height: 72px;
  padding: 10px 12px;
  border: 1px solid var(--fb-hairline);
  border-radius: 0;
  background: var(--fb-paper);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  transition: border-color var(--fb-dur-fast) var(--fb-ease);
}

.fb-input::placeholder { color: var(--fb-faint); }
.fb-input:focus { outline: none; border-color: var(--fb-ink); }
.fb-input[aria-invalid="true"], .fb-input[aria-invalid="true"]:focus { border-color: var(--fb-alert); }

/* The single-line variant (the reporter's name): same frame, no textarea floor. */
.fb-input--line { min-height: 0; }

/* ------------------------------------------------------------------ strip */

/* The tinted band under the head: quiet fill (--surface-tint), a separator
   below. Mono is the site's label register, so the captured context reads as
   what it is - data, not prose. */
.fb-strip {
  border-bottom: 1px solid var(--fb-hairline-2);
  background: var(--fb-tint);
}

.fb-strip__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 20px;
  border: 0;
  background: transparent;
  font-family: var(--fb-mono);
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: 0.01em;
  color: var(--fb-muted);
  text-align: left;
  cursor: pointer;
  transition: color var(--fb-dur-fast) var(--fb-ease);
}

.fb-strip__toggle:hover { color: var(--fb-ink); }

.fb-strip__summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fb-strip__chevron {
  flex: none;
  display: block;
  color: var(--fb-faint);
  transition: transform var(--fb-dur-base) var(--fb-ease);
}
.fb-strip__toggle[aria-expanded="true"] .fb-strip__chevron { transform: rotate(180deg); }

.fb-strip__detail {
  padding: 2px 20px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fb-ink);
}

.fb-strip__row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 3px 0;
}

/* Keys in the eyebrow register (.card__eyebrow): mono, caps, tracked, muted. */
.fb-strip__key {
  flex: 0 0 96px;
  font-family: var(--fb-mono);
  font-size: 11px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--fb-muted);
}

.fb-strip__value {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

/* The one privacy line, in the note register (.lform__note): tiny, muted. */
.fb-strip__foot {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--fb-hairline-2);
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: 0.01em;
  color: var(--fb-muted);
}

/* ------------------------------------------------------------------ notes */

/* Notes are lines of text, not boxes (.lform__hint / .lform__error). */
.fb-note {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: 0.01em;
  color: var(--fb-muted);
}

.fb-note--error {
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: 0;
  color: var(--fb-alert);
}

/* The site's one link contract: quiet sand underline at rest, ink underline
   and a sand wash on hover. */
.fb-textbutton {
  border: 0;
  padding: 0;
  background: none;
  font-size: inherit;
  color: var(--fb-ink);
  text-decoration: underline;
  text-decoration-color: var(--fb-sand-400);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.25em;
  cursor: pointer;
  transition:
    background-color var(--fb-dur-fast) var(--fb-ease),
    text-decoration-color var(--fb-dur-fast) var(--fb-ease);
}

.fb-textbutton:hover {
  text-decoration-color: var(--fb-ink);
  background: var(--fb-sand-200);
}

/* ----------------------------------------------------------------- footer */

.fb-foot {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--fb-hairline-2);
  background: var(--fb-paper);
}

/* The primary button (.btn--primary): sharp, ink, static label. Hover is the
   background plus the arrow swap - primary's only animation. */
.fb-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 18px;
  border: 1px solid transparent;
  border-radius: 0;
  background: var(--fb-primary);
  color: var(--fb-on-primary);
  font-size: 14px;
  line-height: 1.5;
  font-weight: 400;
  letter-spacing: -0.005em;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--fb-dur-fast) var(--fb-ease);
}

.fb-send:hover { background: var(--fb-primary-hover); }
.fb-send[disabled] { opacity: 0.4; pointer-events: none; }

/* Arrow swap inside a clipped 1em window: on hover the first arrow slides out
   to the right, the second slides in from the left (components.css .btn__arrow). */
.fb-send__arrow {
  display: inline-block;
  overflow: hidden;
  width: 1em;
  height: 1em;
  line-height: 0;
}

.fb-send__track {
  display: flex;
  width: 2em;
  transform: translateX(-50%);
  transition: transform var(--fb-dur-base) var(--fb-ease);
  will-change: transform;
}

.fb-send__track svg {
  width: 1em;
  height: 1em;
  flex: none;
  transition: opacity var(--fb-dur-base) var(--fb-ease);
}

/* The parked glyph is also transparent, not just clipped: at a fractional x
   the clip edge lets a pixel of the round line cap through, which read as a
   stray dot after the arrow. */
.fb-send__track svg:first-child { opacity: 0; }
.fb-send:hover .fb-send__track { transform: translateX(0); }
.fb-send:hover .fb-send__track svg:first-child { opacity: 1; }
.fb-send:hover .fb-send__track svg:last-child { opacity: 0; }

/* ---------------------------------------------------------------- success */

/* Success replaces the form - calm and concrete (.lform__done). */
.fb-success {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 12px 0 8px;
}

.fb-success__mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--fb-hairline);
  border-radius: 50%;
  color: var(--fb-ink);
}

.fb-success__mark svg { display: block; }

.fb-success__title {
  margin-top: 16px;
  font-size: 18px;
  line-height: 1.26;
  letter-spacing: -0.02em;
  font-weight: 600;
}

.fb-success__body {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fb-muted);
}

.fb-success__again {
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.5;
}

/* ----------------------------------------------------------------- mobile */

@media (max-width: 639px) {
  .fb-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    pointer-events: auto;
    background: rgba(15, 15, 15, 0.4);
    animation: fb-fade var(--fb-dur-base) var(--fb-ease);
  }

  .fb-backdrop[data-closing="true"] {
    animation: fb-fade var(--fb-dur-fast) var(--fb-ease) reverse forwards;
    pointer-events: none;
  }

  @keyframes fb-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .fb-fab[data-open="true"] { display: none; }

  /* The sheet keeps the sharp corners - a rounded top would be the one curve
     in the whole system. */
  .fb-panel {
    right: 0;
    left: 0;
    top: auto;
    bottom: 0;
    translate: none;
    transform: none;
    width: auto;
    max-height: min(88dvh, 100dvh - 24px);
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
    animation: fb-sheet-in var(--fb-dur-base) var(--fb-ease);
  }

  .fb-panel[data-closing="true"] {
    animation: fb-sheet-out var(--fb-dur-fast) var(--fb-ease) forwards;
  }

  @keyframes fb-sheet-in {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: none; }
  }

  @keyframes fb-sheet-out {
    from { opacity: 1; transform: none; }
    to   { opacity: 0; transform: translateY(12px); }
  }

  /* The sheet covers the trigger, so it needs its own way out (D21). The
     handle is decorative - the close button is the one that is
     keyboard-reachable. A sand line, not a rounded pill. */
  .fb-handle {
    display: block;
    width: 32px;
    height: 2px;
    margin: 10px auto 0;
    background: var(--fb-sand-400);
  }

  .fb-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px 10px 20px;
    border-bottom: 1px solid var(--fb-hairline-2);
  }

  .fb-titlebar__title { font-size: 14px; line-height: 1.5; font-weight: 600; }

  /* Ghost button: background only on hover. */
  .fb-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--fb-ink);
    cursor: pointer;
    transition: background-color var(--fb-dur-fast) var(--fb-ease);
  }

  .fb-close:hover { background: var(--fb-tint); }
}

/* Reduced motion keeps the fades - they carry the state change - and drops
   everything that moves or resizes. The label stops collapsing and simply
   goes, which is the one place the two modes look different. */
@media (prefers-reduced-motion: reduce) {
  :host { --fb-dur-fast: 100ms; --fb-dur-base: 120ms; }

  .fb-panel,
  .fb-panel[data-closing="true"] {
    animation-name: fb-fade-safe;
  }

  @keyframes fb-fade-safe {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .fb-panel[data-closing="true"] { animation-direction: reverse; }

  .fb-fab, .fb-input, .fb-send, .fb-send__track, .fb-strip__chevron, .fb-textbutton { transition: none; }
  .fb-fab__label { transition: none; }
}
`;
