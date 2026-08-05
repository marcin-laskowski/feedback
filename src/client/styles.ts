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
  --fb-accent: #16181d;
  --fb-on-accent: #ffffff;
  --fb-danger: #b4291f;
  --fb-radius: 12px;
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
    --fb-accent: #eceef1;
    --fb-on-accent: #16181d;
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

/* ---------------------------------------------------------------- trigger */

.fb-fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--fb-line);
  border-radius: 999px;
  background: var(--fb-surface);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 140ms ease, background-color 140ms ease;
}

.fb-fab:hover { border-color: var(--fb-accent); }
.fb-fab[data-open="true"] .fb-fab__label { display: none; }

.fb-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--fb-accent);
}

/* --------------------------------------------------------------- backdrop */

/* Mobile only. On desktop the panel sits beside the page the user is
   reviewing — dimming it would hide the thing they are reporting on. */
.fb-backdrop { display: none; }

/* ------------------------------------------------------------------ panel */

.fb-panel {
  position: fixed;
  right: 16px;
  bottom: 68px;                       /* FAB height + 8px gap */
  width: 380px;
  max-height: min(640px, 100dvh - 32px);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  background: var(--fb-surface);
  border: 1px solid var(--fb-line);
  border-radius: var(--fb-radius);
  overflow: hidden;
  animation: fb-rise 160ms ease-out;
}

@keyframes fb-rise {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
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
  border: 1px solid var(--fb-accent);
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
  }

  .fb-fab[data-open="true"] { display: none; }

  .fb-panel {
    right: 0;
    left: 0;
    bottom: 0;
    width: auto;
    max-height: min(88dvh, 100dvh - 24px);
    border-radius: 16px 16px 0 0;
    border-bottom: 0;
    animation: fb-sheet 180ms ease-out;
  }

  @keyframes fb-sheet {
    from { transform: translateY(12px); }
    to   { transform: none; }
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

@media (prefers-reduced-motion: reduce) {
  .fb-panel { animation: none; }
  .fb-fab, .fb-pill, .fb-input, .fb-send, .fb-strip__chevron { transition: none; }
}
`;
