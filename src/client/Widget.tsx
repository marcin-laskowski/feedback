"use client";

/**
 * The widget's state machine, running inside the shadow root.
 *
 *   Closed ──FAB / ?feedback=open──▶ Open ──send──▶ Validating ─┬─invalid──▶ Open
 *      ▲                              │                          └─valid────▶ Submitting
 *      │                              │                                          │
 *      └──Esc / backdrop / close ─────┘                            ┌─200────▶ Success
 *      └──auto 4s (cancelled on hover/focus) ◀────────────────────┤
 *                                                                 └─4xx/5xx▶ Failed
 *
 * There is deliberately no ConfirmDiscard state. The plan had one, but once
 * the draft persists (D17) closing loses nothing - the confirm dialog asked
 * permission for something that no longer happens, and a modal inside a modal
 * is the worst focus-trap surface in the widget. The restore line's
 * "Zacznij od nowa" is the discard.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SCHEMA_VERSION, type FeedbackContext, type SubmitResponse } from "../shared/types";
import { stripDeepLinkParam } from "../shared/redact";
import { strings } from "../shared/strings";
import { validateReport, type RequiredField } from "../shared/validate";
import { collectContext } from "./context";
import { clearDraft, readDraft, writeDraft, type Draft } from "./draft";
import { initNav, onLocationChange } from "./nav";
import { read, write } from "./storage";
import { Panel, type PanelStatus } from "./Panel";

export type Reveal = "always" | "invited";

type Props = {
  project: string;
  endpoint: string;
  reveal: Reveal;
  shadowRoot: ShadowRoot;
};

const INVITED_KEY = "fb.invited";
/** The reporter's name, remembered per browser so it is typed once. */
const REPORTER_KEY = "fb.reporter";
const DEEP_LINK_PARAM = "feedback";
const SUBMIT_TIMEOUT_MS = 15_000;
const DRAFT_DEBOUNCE_MS = 400;
const RESIZE_DEBOUNCE_MS = 200;
const SUCCESS_CLOSE_MS = 4_000;
const WARMUP_COOLDOWN_MS = 60_000;

/**
 * Type and severity are no longer asked for in the form - the questions that
 * matter are what, why and who - but the sink still requires both fields
 * (additive-only contract), so every report carries these two constants.
 */
const EMPTY_DRAFT: Draft = { type: "bug", severity: "annoying", what: "", why: "" };

/** Must match --fb-dur-fast in styles.ts - the panel unmounts when its exit ends. */
const EXIT_MS = 180;

const FOCUSABLE =
  'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function Widget({ project, endpoint, reveal, shadowRoot }: Props) {
  const [open, setOpen] = useState(false);
  const [invited, setInvited] = useState(reveal === "always");
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  /** Not part of the draft: the draft is per page, the reporter is per person. */
  const [reporter, setReporter] = useState("");
  const [invalid, setInvalid] = useState<RequiredField[]>([]);
  const [restored, setRestored] = useState(false);
  const [stripExpanded, setStripExpanded] = useState(false);
  const [context, setContext] = useState<FeedbackContext | null>(null);

  /**
   * The panel outlives `open` by one animation. Unmounting on close would make
   * it vanish mid-air, which is the single cheapest-looking thing an overlay
   * can do - arriving with motion and leaving without it reads as a bug.
   */
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mountedRef.current) return;

    setClosing(true);
    const timer = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  const panelRef = useRef<HTMLDivElement>(null);
  const pathnameRef = useRef<string>("");
  const warmedAt = useRef(0);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Latest draft, readable from listeners that outlive a render. */
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const openPanel = useCallback(() => {
    pathnameRef.current = window.location.pathname;
    const saved = readDraft(pathnameRef.current);
    setDraft(saved ?? EMPTY_DRAFT);
    setRestored(Boolean(saved));
    setInvalid([]);
    setStatus("idle");
    setContext(collectContext());
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    if (status === "submitting") return;
    setOpen(false);
    setStripExpanded(false);
  }, [status]);

  // --- deep link -----------------------------------------------------------
  // No `useSearchParams` here: this root lives outside Next's provider tree
  // (D19), so the URL is read straight off `window.location`.
  useEffect(() => {
    initNav();
    setReporter(read("local", REPORTER_KEY) ?? "");
    if (reveal === "invited" && read("local", INVITED_KEY) === "1") setInvited(true);

    const check = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get(DEEP_LINK_PARAM) !== "open") return;

      setInvited(true);
      write("local", INVITED_KEY, "1");
      openPanel();

      // Strip the param immediately. A shared link should not re-open the panel
      // forever, and leaving it in would write `?feedback=open` into the
      // `page_url` of every report that arrived through the channel we are
      // actively promoting.
      const search = stripDeepLinkParam(window.location.search);
      window.history.replaceState(null, "", window.location.pathname + search + window.location.hash);
    };

    check();
    window.addEventListener("popstate", check);
    return () => window.removeEventListener("popstate", check);
  }, [openPanel, reveal]);

  // --- warm-up -------------------------------------------------------------
  // Apps Script cold start is 1-3 s and, with the retry queue gone, it is the
  // whole p95 budget. The ping goes to OUR route, not to the sink: the sink's
  // URL and token are server-side only.
  useEffect(() => {
    if (!open) return;
    const now = Date.now();
    if (now - warmedAt.current < WARMUP_COOLDOWN_MS) return;
    warmedAt.current = now;
    fetch(endpoint, { method: "GET" }).catch(() => {
      // Fire and forget - a failed warm-up costs a slower submit, nothing else.
    });
  }, [open, endpoint]);

  // --- navigating with the panel open --------------------------------------
  /**
   * The context is captured when the panel opens, so browsing on with the panel
   * up left it describing the page you came from - a report filed against the
   * wrong URL, which is the failure mode this widget exists to prevent.
   *
   * It re-reads only while the form is untouched. Once there is text in it, the
   * report is ABOUT the page it was started on, and silently repointing it at
   * wherever the reporter wandered to would be the same bug with extra steps.
   */
  useEffect(() => {
    if (!open) return;
    return onLocationChange(() => {
      const dirty = draftRef.current.what.trim() || draftRef.current.why.trim();
      if (dirty) return;

      pathnameRef.current = window.location.pathname;
      const saved = readDraft(pathnameRef.current);
      setDraft(saved ?? EMPTY_DRAFT);
      setRestored(Boolean(saved));
      setContext(collectContext());
    });
  }, [open]);

  // --- live context --------------------------------------------------------
  // The strip lies the moment someone drags their window, which is exactly the
  // scenario the widget exists to capture.
  useEffect(() => {
    if (!open) return;
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setContext(collectContext()), RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // --- draft persistence ---------------------------------------------------
  useEffect(() => {
    if (!open || status === "success") return;
    const timer = setTimeout(() => {
      if (draft.what.trim() || draft.why.trim()) {
        writeDraft(pathnameRef.current, draft);
      }
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, open, status]);

  // --- keyboard ------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (status === "submitting") return;
        event.preventDefault();
        closePanel();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      // Inside a shadow root the active element is on the root, not the document.
      const active = shadowRoot.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, status, closePanel, shadowRoot]);

  // Focus the first field, not the close button - the panel exists to be typed in.
  useEffect(() => {
    if (!open || status !== "idle") return;
    const field = panelRef.current?.querySelector<HTMLTextAreaElement>("#fb-what");
    field?.focus();
  }, [open, status]);

  // --- success auto-close --------------------------------------------------
  useEffect(() => {
    if (status !== "success") return;
    successTimer.current = setTimeout(() => {
      setOpen(false);
      setStatus("idle");
      setDraft(EMPTY_DRAFT);
    }, SUCCESS_CLOSE_MS);
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [status]);

  const holdSuccess = useCallback(() => {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
      successTimer.current = null;
    }
  }, []);

  // --- submit --------------------------------------------------------------
  const submit = useCallback(async () => {
    if (status === "submitting") return;

    const problems = validateReport({ ...draft, reporter });
    if (problems.length) {
      setInvalid(problems);
      return;
    }

    setInvalid([]);
    setStatus("submitting");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          project,
          type: draft.type,
          severity: draft.severity,
          what: draft.what,
          why: draft.why,
          reporter: reporter.trim(),
          context: collectContext(),
        }),
      });

      const result = (await response.json()) as SubmitResponse;

      if (!result.ok) {
        if (result.error === "validation") setInvalid(result.fields as RequiredField[]);
        setStatus("failed");
        return;
      }

      // Clear the draft BEFORE the success screen renders. Otherwise
      // "Zgłoś kolejną rzecz" repopulates the form with the report that was
      // just sent, which is the worst version of this bug.
      clearDraft(pathnameRef.current);
      write("local", REPORTER_KEY, reporter.trim());
      setStatus("success");
    } catch {
      setStatus("failed");
    } finally {
      clearTimeout(timeout);
    }
  }, [draft, reporter, endpoint, project, status]);

  const onChange = useCallback((patch: Partial<Draft>) => {
    setRestored(false);
    setInvalid([]);
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const onReporterChange = useCallback((value: string) => {
    setInvalid([]);
    setReporter(value);
  }, []);

  const discardDraft = useCallback(() => {
    clearDraft(pathnameRef.current);
    setDraft(EMPTY_DRAFT);
    setRestored(false);
    setInvalid([]);
  }, []);

  const startOver = useCallback(() => {
    holdSuccess();
    setDraft(EMPTY_DRAFT);
    setRestored(false);
    setInvalid([]);
    setStatus("idle");
    setContext(collectContext());
  }, [holdSuccess]);

  const fabLabel = useMemo(() => (open ? strings.fabClose : strings.fab), [open]);

  if (!invited) return null;

  return (
    <>
      {mounted && (
        <div
          className="fb-backdrop"
          data-closing={closing ? "true" : "false"}
          onClick={closePanel}
          aria-hidden="true"
        />
      )}

      {mounted && context && (
        <div
          className="fb-panel"
          role="dialog"
          aria-modal="true"
          aria-label={strings.panelTitle}
          aria-hidden={closing || undefined}
          data-closing={closing ? "true" : "false"}
          ref={panelRef}
          onMouseEnter={holdSuccess}
          onFocusCapture={holdSuccess}
        >
          <Panel
            context={context}
            draft={draft}
            reporter={reporter}
            status={status}
            invalid={invalid}
            restored={restored}
            stripExpanded={stripExpanded}
            onToggleStrip={() => setStripExpanded((v) => !v)}
            onChange={onChange}
            onReporterChange={onReporterChange}
            onDiscardDraft={discardDraft}
            onSubmit={() => void submit()}
            onClose={closePanel}
            onAgain={startOver}
          />
        </div>
      )}

      {/* A tab on the right edge of the viewport, vertically centred: an icon
          at rest, the label slides out to the left on hover and on keyboard
          focus. On desktop it doubles as the close control (the panel is
          anchored beside it); on mobile the sheet covers it, so CSS hides it
          and the title bar's close button takes over (D21). */}
      <button
        type="button"
        className="fb-fab"
        data-open={open ? "true" : "false"}
        aria-expanded={open}
        aria-label={fabLabel}
        onClick={() => (open ? closePanel() : openPanel())}
      >
        {open ? <CloseIcon /> : <FeedbackIcon />}
        {/* The label stays mounted and collapses to a zero-width grid column;
            `aria-label` above carries the accessible name, so the clipped text
            never becomes it. */}
        <span className="fb-fab__label">
          <span>{fabLabel}</span>
        </span>
      </button>
    </>
  );
}

function FeedbackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
