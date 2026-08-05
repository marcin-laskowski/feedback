/**
 * The widget's entire stylesheet, injected into the shadow root.
 *
 * Shadow DOM is what lets this be a flat token block with generic class names:
 * nothing here can reach the host page and nothing on the host page can reach
 * in. That is also why the widget does NOT inherit the host's design system —
 * it is a tool sitting on top of the site, not a section of it.
 */

export const CSS = `
:host {
  --fb-ink: #16181d;
  --fb-ink-2: #6b7078;
  --fb-surface: #ffffff;
  --fb-surface-2: #f4f5f6;
  --fb-line: rgba(22, 24, 29, 0.14);
  --fb-line-2: rgba(22, 24, 29, 0.07);
  /* Blue on purpose. The widget is a tool laid over somebody else's design
     system, and reading as "not part of this site" is the point — a trigger
     that blends in is a trigger nobody clicks. */
  --fb-accent: #2563eb;
  --fb-accent-strong: #1d4ed8;
  --fb-on-accent: #ffffff;
  --fb-danger: #b4291f;
  --fb-radius: 12px;
  /* Decelerating curve — fast off the mark, long settle. The thing that makes
     an interface feel considered rather than snappy. */
  --fb-ease-enter: cubic-bezier(0.22, 1, 0.36, 1);
  /* Leaving is not the mirror of arriving. Exits get out of the way. */
  --fb-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --fb-enter: 280ms;
  --fb-exit: 150ms;
  --fb-font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --fb-mono: ui-monospace, SFMono-Regular, Menlo, monospace;

  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  font-family: var(--fb-font);
  color: var(--fb-ink);
}

@media (prefers-color-scheme: dark) {
  :host {
    --fb-ink: #eceef1;
    --fb-ink-2: #9aa0a8;
    --fb-surface: #1b1d22;
    --fb-surface-2: #24272d;
    --fb-line: rgba(236, 238, 241, 0.16);
    --fb-line-2: rgba(236, 238, 241, 0.08);
    --fb-accent: #3b82f6;
    --fb-accent-strong: #2563eb;
    --fb-on-accent: #ffffff;
    --fb-danger: #ff8b80;
  }
}

*, *::before, *::after { box-sizing: border-box; }

button, input, textarea {
  font: inherit;
  color: inherit;
  margin: 0;
}

:focus-visible {
  outline: 2px solid var(--fb-accent);
  outline-offset: 2px;
}

/* The trigger is round and already sits on its own shadow, so a ring hugging
   it at 2 px reads as part of the shape rather than as focus. Push it out. */
.fb-fab:focus-visible { outline-offset: 4px; }

/* Pointer users get no ring at all — Safari hands buttons :focus after a click,
   which is where the stacked-rings look came from in the first place. */
.fb-fab:focus:not(:focus-visible) { outline: none; }

/* ---------------------------------------------------------------- trigger */

/* Position comes from inline style — the trigger is draggable and its place is
   remembered per browser. Its size is measured at runtime rather than pinned
   here, because the label swaps between "Zgłoś uwagę" and "Zamknij". */
.fb-fab {
  position: fixed;
  height: 38px;
  padding: 0 14px 0 11px;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  border: 0;
  border-radius: 999px;
  background: var(--fb-accent);
  color: var(--fb-on-accent);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.005em;
  white-space: nowrap;
  cursor: grab;
  /* Without this the browser claims the gesture for scrolling on touch and the
     drag never starts. */
  touch-action: none;
  /* Restrained: enough separation from the page beneath, not a floating slab.
     Static, never a hover lift. */
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.18);
  transition:
    background-color var(--fb-enter) var(--fb-ease-enter),
    color var(--fb-enter) var(--fb-ease-enter),
    padding var(--fb-enter) var(--fb-ease-enter),
    box-shadow var(--fb-enter) var(--fb-ease-enter);
}

.fb-fab:hover { background: var(--fb-accent-strong); }
.fb-fab[data-dragging="true"] { cursor: grabbing; }
.fb-fab svg { display: block; flex: none; }

/* Open: the pill collapses to a neutral circle holding an ✕. Secondary,
   because once the panel is up the trigger is no longer the thing asking for
   attention — the form is.

   Tone carries that on its own. An earlier version also drew a hairline ring
   inside the circle, which stacked with the focus outline into a bullseye —
   two concentric rings around a cross. A filled shape needs one edge, not two. */
.fb-fab[data-open="true"] {
  padding: 0 11.5px;
  background: var(--fb-surface-2);
  color: var(--fb-ink);
}

.fb-fab[data-open="true"]:hover { background: var(--fb-line-2); }

/* The label collapses rather than disappearing. A grid column animating from
   1fr to 0fr is the one way to transition intrinsic width, so the pill morphs
   into the circle instead of snapping between two shapes.

   The gap between icon and text is a MARGIN on the collapsing element, not
   padding on the text inside it. Padding inside a box that has been squeezed
   to zero width cannot go below the padding itself, so it survived the
   collapse as a stubborn 7 px on the right of the ✕ — which is what pushed the
   circle off centre and out of line with the panel. */
.fb-fab__label {
  display: grid;
  grid-template-columns: 1fr;
  margin-left: 7px;
  transition:
    grid-template-columns var(--fb-enter) var(--fb-ease-enter),
    margin-left var(--fb-enter) var(--fb-ease-enter),
    opacity 160ms ease;
}

.fb-fab__label > span {
  overflow: hidden;
  white-space: nowrap;
}

.fb-fab[data-open="true"] .fb-fab__label {
  grid-template-columns: 0fr;
  margin-left: 0;
  opacity: 0;
}

/* --------------------------------------------------------------- backdrop */

/* Mobile only. On desktop the panel sits beside the page the user is
   reviewing — dimming it would hide the thing they are reporting on. */
.fb-backdrop { display: none; }

/* ------------------------------------------------------------------ panel */

/* Fallback anchoring, used only for the frame before the trigger has been
   measured. On desktop an inline style overrides left/top/bottom so the panel
   follows the trigger wherever it was dragged. On mobile the media query below
   wins and the panel is a sheet regardless of where the trigger sits. */
.fb-panel {
  position: fixed;
  right: 16px;
  bottom: 70px;
  transform: none;
  width: 380px;
  max-height: min(640px, 100dvh - 32px);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  background: var(--fb-surface);
  border: 1px solid var(--fb-line);
  border-radius: var(--fb-radius);
  overflow: hidden;
  animation: fb-in var(--fb-enter) var(--fb-ease-enter);
}

/* Grows out of the corner it is docked to — transform-origin is set inline to
   whichever corner the trigger sits at, so the panel always appears to come
   from the button rather than from nowhere. The last keyframe is "none", which
   is also what the inline transform is, so nothing snaps when the animation
   hands back control. */
@keyframes fb-in {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: none; }
}

/* Leaving is shorter and shallower than arriving. A panel that dismisses at
   the same pace it appeared feels reluctant. */
.fb-panel[data-closing="true"] {
  animation: fb-out var(--fb-exit) var(--fb-ease-exit) forwards;
  pointer-events: none;
}

@keyframes fb-out {
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: scale(0.97); }
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
  padding: 14px 16px 16px;
}

.fb-field + .fb-field { margin-top: 14px; }

.fb-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
}

.fb-input {
  display: block;
  width: 100%;
  min-height: 72px;
  padding: 9px 10px;
  border: 1px solid var(--fb-line);
  border-radius: 8px;
  background: var(--fb-surface);
  font-size: 14px;
  line-height: 1.45;
  resize: none;
  transition: border-color 140ms ease;
}

.fb-input::placeholder { color: var(--fb-ink-2); }
.fb-input:focus { border-color: var(--fb-accent); }
.fb-input[aria-invalid="true"] { border-color: var(--fb-danger); }

.fb-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.fb-pill {
  padding: 5px 11px;
  border: 1px solid var(--fb-line);
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 140ms ease, background-color 140ms ease, color 140ms ease;
}

.fb-pill:hover { border-color: var(--fb-accent); }

.fb-pill[aria-pressed="true"] {
  background: var(--fb-accent);
  border-color: var(--fb-accent);
  color: var(--fb-on-accent);
}

/* ------------------------------------------------------------------ strip */

.fb-strip {
  border-bottom: 1px solid var(--fb-line-2);
  background: var(--fb-surface-2);
}

.fb-strip__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 9px 16px;
  border: 0;
  background: transparent;
  font-family: var(--fb-mono);
  font-size: 12px;
  color: var(--fb-ink-2);
  text-align: left;
  cursor: pointer;
}

.fb-strip__summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fb-strip__chevron { transition: transform 140ms ease; }
.fb-strip__toggle[aria-expanded="true"] .fb-strip__chevron { transform: rotate(180deg); }

.fb-strip__detail {
  padding: 0 16px 12px;
  font-family: var(--fb-mono);
  font-size: 12px;
  color: var(--fb-ink-2);
}

.fb-strip__row {
  display: flex;
  gap: 10px;
  padding: 2px 0;
}

.fb-strip__key {
  flex: 0 0 96px;
  color: var(--fb-ink-2);
  opacity: 0.75;
}

.fb-strip__value {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.fb-strip__foot {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--fb-line-2);
}

/* ------------------------------------------------------------------ notes */

.fb-note {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--fb-surface-2);
  font-size: 13px;
  color: var(--fb-ink-2);
}

.fb-note--error {
  background: transparent;
  border: 1px solid var(--fb-danger);
  color: var(--fb-danger);
}

.fb-textbutton {
  border: 0;
  padding: 0;
  background: none;
  font-size: inherit;
  color: var(--fb-ink);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

/* ----------------------------------------------------------------- footer */

.fb-foot {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--fb-line);
  background: var(--fb-surface);
}

.fb-send {
  height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: var(--fb-accent);
  color: var(--fb-on-accent);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 140ms ease;
}

.fb-send[disabled] { opacity: 0.45; cursor: default; }

/* ---------------------------------------------------------------- success */

.fb-success {
  padding: 28px 16px 32px;
  text-align: center;
}

.fb-success__title { font-size: 15px; font-weight: 600; }
.fb-success__body { margin-top: 4px; font-size: 13px; color: var(--fb-ink-2); }
.fb-success__again { margin-top: 14px; }

/* ----------------------------------------------------------------- mobile */

@media (max-width: 639px) {
  .fb-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    pointer-events: auto;
    background: rgba(0, 0, 0, 0.32);
    animation: fb-fade var(--fb-enter) var(--fb-ease-enter);
  }

  .fb-backdrop[data-closing="true"] {
    animation: fb-fade var(--fb-exit) var(--fb-ease-exit) reverse forwards;
    pointer-events: none;
  }

  @keyframes fb-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .fb-fab[data-open="true"] { display: none; }

  .fb-panel {
    right: 0;
    left: 0;
    top: auto;
    bottom: 0;
    transform: none;
    width: auto;
    max-height: min(88dvh, 100dvh - 24px);
    border-radius: 16px 16px 0 0;
    border-bottom: 0;
    animation: fb-sheet-in var(--fb-enter) var(--fb-ease-enter);
  }

  .fb-panel[data-closing="true"] {
    animation: fb-sheet-out var(--fb-exit) var(--fb-ease-exit) forwards;
  }

  /* The sheet slides, it does not scale — on a bottom sheet the edge of the
     screen is the origin, and scaling from it looks like a mistake. */
  @keyframes fb-sheet-in {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: none; }
  }

  @keyframes fb-sheet-out {
    from { opacity: 1; transform: none; }
    to   { opacity: 0; transform: translateY(18px); }
  }

  /* The sheet covers the FAB, so it needs its own way out (D21). The handle is
     decorative — the close button is the one that is keyboard-reachable. */
  .fb-handle {
    display: block;
    width: 36px;
    height: 4px;
    margin: 8px auto 0;
    border-radius: 999px;
    background: var(--fb-line);
  }

  .fb-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px 10px 16px;
    border-bottom: 1px solid var(--fb-line-2);
  }

  .fb-titlebar__title { font-size: 14px; font-weight: 600; }

  .fb-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
  }
}

/* Reduced motion keeps the fades — they carry the state change — and drops
   everything that moves or resizes. The label stops collapsing and simply
   goes, which is the one place the two modes look different. */
@media (prefers-reduced-motion: reduce) {
  :root, :host { --fb-enter: 120ms; --fb-exit: 100ms; }

  .fb-panel,
  .fb-panel[data-closing="true"] {
    animation-name: fb-fade-safe;
  }

  @keyframes fb-fade-safe {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .fb-panel[data-closing="true"] { animation-direction: reverse; }

  .fb-fab, .fb-pill, .fb-input, .fb-send, .fb-strip__chevron { transition: none; }
  .fb-fab__label { transition: none; }
}
`;
