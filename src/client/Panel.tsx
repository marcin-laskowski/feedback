"use client";

import { useEffect, useRef } from "react";
import {
  FEEDBACK_SEVERITIES,
  FEEDBACK_TYPES,
  MAX_TEXT,
  type FeedbackContext,
  type FeedbackSeverity,
  type FeedbackType,
} from "../shared/types";
import { severityLabels, strings, typeLabels } from "../shared/strings";
import type { RequiredField } from "../shared/validate";
import type { Draft } from "./draft";
import { ContextStrip } from "./ContextStrip";

export type PanelStatus = "idle" | "submitting" | "success" | "failed";

type Props = {
  context: FeedbackContext;
  draft: Draft;
  status: PanelStatus;
  invalid: RequiredField[];
  restored: boolean;
  stripExpanded: boolean;
  onToggleStrip: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onDiscardDraft: () => void;
  onSubmit: () => void;
  onClose: () => void;
  onAgain: () => void;
};

export function Panel({
  context,
  draft,
  status,
  invalid,
  restored,
  stripExpanded,
  onToggleStrip,
  onChange,
  onDiscardDraft,
  onSubmit,
  onClose,
  onAgain,
}: Props) {
  const whatRef = useRef<HTMLTextAreaElement>(null);
  const whyRef = useRef<HTMLTextAreaElement>(null);

  // Focus the first field that failed, so the error is where the cursor is.
  useEffect(() => {
    if (!invalid.length) return;
    if (invalid.includes("what")) whatRef.current?.focus();
    else if (invalid.includes("why")) whyRef.current?.focus();
  }, [invalid]);

  if (status === "success") {
    return (
      <>
        <Header onClose={onClose} />
        <div className="fb-body">
          <div className="fb-success" role="status">
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
          <span className="fb-label">{strings.typeLabel}</span>
          <div className="fb-pills">
            {FEEDBACK_TYPES.map((value) => (
              <Pill
                key={value}
                label={typeLabels[value]}
                selected={draft.type === value}
                disabled={busy}
                onClick={() => onChange({ type: value as FeedbackType })}
              />
            ))}
          </div>
        </div>

        <div className="fb-field">
          <span className="fb-label">{strings.severityLabel}</span>
          <div className="fb-pills">
            {FEEDBACK_SEVERITIES.map((value) => (
              <Pill
                key={value}
                label={severityLabels[value]}
                selected={draft.severity === value}
                disabled={busy}
                onClick={() => onChange({ severity: value as FeedbackSeverity })}
              />
            ))}
          </div>
        </div>

        <div className="fb-field">
          <label className="fb-label" htmlFor="fb-how">
            {strings.howLabel}
          </label>
          <AutoTextarea
            id="fb-how"
            value={draft.how}
            placeholder={strings.howPlaceholder}
            invalid={false}
            disabled={busy}
            onChange={(how) => onChange({ how })}
          />
        </div>
      </div>

      <div className="fb-foot">
        <button type="button" className="fb-send" onClick={onSubmit} disabled={busy}>
          {busy ? strings.sending : strings.send}
        </button>
      </div>
    </>
  );
}

/** Mobile-only title bar — on desktop the FAB sits 8 px below and is the close. */
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

function Pill({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="fb-pill"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
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
