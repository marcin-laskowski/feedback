"use client";

import { useEffect, useRef } from "react";
import { MAX_REPORTER, MAX_TEXT, type FeedbackContext } from "../shared/types";
import { strings } from "../shared/strings";
import type { RequiredField } from "../shared/validate";
import type { Draft } from "./draft";
import { ContextStrip } from "./ContextStrip";

export type PanelStatus = "idle" | "submitting" | "success" | "failed";

type Props = {
  context: FeedbackContext;
  draft: Draft;
  reporter: string;
  status: PanelStatus;
  invalid: RequiredField[];
  restored: boolean;
  stripExpanded: boolean;
  onToggleStrip: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onReporterChange: (value: string) => void;
  onDiscardDraft: () => void;
  onSubmit: () => void;
  onClose: () => void;
  onAgain: () => void;
};

export function Panel({
  context,
  draft,
  reporter,
  status,
  invalid,
  restored,
  stripExpanded,
  onToggleStrip,
  onChange,
  onReporterChange,
  onDiscardDraft,
  onSubmit,
  onClose,
  onAgain,
}: Props) {
  const whatRef = useRef<HTMLTextAreaElement>(null);
  const whyRef = useRef<HTMLTextAreaElement>(null);
  const reporterRef = useRef<HTMLInputElement>(null);

  // Focus the first field that failed, so the error is where the cursor is.
  useEffect(() => {
    if (!invalid.length) return;
    if (invalid.includes("what")) whatRef.current?.focus();
    else if (invalid.includes("why")) whyRef.current?.focus();
    else if (invalid.includes("reporter")) reporterRef.current?.focus();
  }, [invalid]);

  if (status === "success") {
    return (
      <>
        <Header onClose={onClose} />
        <div className="fb-body">
          <div className="fb-success" role="status">
            <span className="fb-success__mark" aria-hidden="true">
              <CheckIcon />
            </span>
            <div className="fb-success__title">{strings.successTitle}</div>
            <div className="fb-success__body">{strings.successBody}</div>
            <div className="fb-success__again">
              <button type="button" className="fb-textbutton" onClick={onAgain}>
                {strings.successAgain}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const busy = status === "submitting";

  return (
    <>
      <Header onClose={onClose} />
      <ContextStrip context={context} expanded={stripExpanded} onToggle={onToggleStrip} />

      <div className="fb-body">
        {restored && (
          <div className="fb-note">
            <span>{strings.draftRestored}</span>
            <span aria-hidden="true">·</span>
            <button type="button" className="fb-textbutton" onClick={onDiscardDraft}>
              {strings.draftDiscard}
            </button>
          </div>
        )}

        {status === "failed" && (
          <div className="fb-note fb-note--error" role="alert">
            <span>{strings.errorSend}</span>
          </div>
        )}

        <div className="fb-field">
          <label className="fb-label" htmlFor="fb-what">
            {strings.whatLabel}
          </label>
          <AutoTextarea
            id="fb-what"
            ref={whatRef}
            value={draft.what}
            placeholder={strings.whatPlaceholder}
            invalid={invalid.includes("what")}
            disabled={busy}
            onChange={(what) => onChange({ what })}
          />
        </div>

        <div className="fb-field">
          <label className="fb-label" htmlFor="fb-why">
            {strings.whyLabel}
          </label>
          <AutoTextarea
            id="fb-why"
            ref={whyRef}
            value={draft.why}
            placeholder={strings.whyPlaceholder}
            invalid={invalid.includes("why")}
            disabled={busy}
            onChange={(why) => onChange({ why })}
          />
        </div>

        <div className="fb-field">
          <label className="fb-label" htmlFor="fb-reporter">
            {strings.reporterLabel}
          </label>
          <input
            id="fb-reporter"
            className="fb-input fb-input--line"
            ref={reporterRef}
            type="text"
            name="name"
            autoComplete="name"
            value={reporter}
            placeholder={strings.reporterPlaceholder}
            maxLength={MAX_REPORTER}
            disabled={busy}
            aria-invalid={invalid.includes("reporter") || undefined}
            onChange={(e) => onReporterChange(e.target.value)}
          />
        </div>
      </div>

      <div className="fb-foot">
        <button type="button" className="fb-send" onClick={onSubmit} disabled={busy}>
          <span>{busy ? strings.sending : strings.send}</span>
          <SendArrow />
        </button>
      </div>
    </>
  );
}

/** Mobile-only title bar - on desktop the FAB sits 8 px below and is the close. */
function Header({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fb-handle" aria-hidden="true" />
      <div className="fb-titlebar">
        <span className="fb-titlebar__title">{strings.panelTitle}</span>
        <button type="button" className="fb-close" aria-label={strings.close} onClick={onClose}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </>
  );
}

/**
 * The primary button's arrow: two glyphs in a clipped 1em window, swapped on
 * hover (the site's `.btn__arrow-slot`). Decorative - the label carries the name.
 */
function SendArrow() {
  return (
    <span className="fb-send__arrow" aria-hidden="true">
      <span className="fb-send__track">
        <ArrowGlyph />
        <ArrowGlyph />
      </span>
    </span>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M3 8h9M8.5 3.5 13 8l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

type AutoTextareaProps = {
  id: string;
  value: string;
  placeholder: string;
  invalid: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  ref?: React.Ref<HTMLTextAreaElement>;
};

function AutoTextarea({
  id,
  value,
  placeholder,
  invalid,
  disabled,
  onChange,
  ref,
}: AutoTextareaProps) {
  const inner = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      id={id}
      className="fb-input"
      ref={(node) => {
        inner.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = node;
      }}
      value={value}
      placeholder={placeholder}
      maxLength={MAX_TEXT}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
