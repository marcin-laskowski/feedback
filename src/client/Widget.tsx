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
 * the draft persists (D17) closing loses nothing — the confirm dialog asked
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
import { initNav } from "./nav";
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
const DEEP_LINK_PARAM = "feedback";
const SUBMIT_TIMEOUT_MS = 15_000;
const DRAFT_DEBOUNCE_MS = 400;
const RESIZE_DEBOUNCE_MS = 200;
const SUCCESS_CLOSE_MS = 4_000;
const WARMUP_COOLDOWN_MS = 60_000;

const EMPTY_DRAFT: Draft = { type: "bug", severity: "annoying", what: "", why: "", how: "" };

const FOCUSABLE =
  'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function Widget({ project, endpoint, reveal, shadowRoot }: Props) {
  const [open, setOpen] = useState(false);
  const [invited, setInvited] = useState(reveal === "always");
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [invalid, setInvalid] = useState<RequiredField[]>([]);
  const [restored, setRestored] = useState(false);
  const [stripExpanded, setStripExpanded] = useState(false);
  const [context, setContext] = useState<FeedbackContext | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const pathnameRef = useRef<string>("");
  const warmedAt = useRef(0);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // Apps Script cold start is 1–3 s and, with the retry queue gone, it is the
  // whole p95 budget. The ping goes to OUR route, not to the sink: the sink's
  // URL and token are server-side only.
  useEffect(() => {
    if (!open) return;
    const now = Date.now();
    if (now - warmedAt.current < WARMUP_COOLDOWN_MS) return;
    warmedAt.current = now;
    fetch(endpoint, { method: "GET" }).catch(() => {
      // Fire and forget — a failed warm-up costs a slower submit, nothing else.
    });
  }, [open, endpoint]);

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
      if (draft.what.trim() || draft.why.trim() || draft.how.trim()) {
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

  // Focus the first field, not the close button — the panel exists to be typed in.
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

    const problems = validateReport(draft);
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
          how: draft.how,
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
      setStatus("success");
    } catch {
      setStatus("failed");
    } finally {
      clearTimeout(timeout);
    }
  }, [draft, endpoint, project, status]);

  const onChange = useCallback((patch: Partial<Draft>) => {
    setRestored(false);
    setInvalid([]);
    setDraft((current) => ({ ...current, ...patch }));
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
      {open && <div className="fb-backdrop" onClick={closePanel} aria-hidden="true" />}

      {open && context && (
        <div
          className="fb-panel"
          role="dialog"
          aria-modal="true"
          aria-label={strings.panelTitle}
          ref={panelRef}
          onMouseEnter={holdSuccess}
          onFocusCapture={holdSuccess}
        >
          <Panel
            context={context}
            draft={draft}
            status={status}
            invalid={invalid}
            restored={restored}
            stripExpanded={stripExpanded}
            onToggleStrip={() => setStripExpanded((v) => !v)}
            onChange={onChange}
            onDiscardDraft={discardDraft}
            onSubmit={() => void submit()}
            onClose={closePanel}
            onAgain={startOver}
          />
        </div>
      )}

      {/* On desktop the FAB doubles as the close control (the panel sits 8 px
          above it). On mobile the sheet covers it, so CSS hides it and the
          title bar's close button takes over (D21). */}
      <button
        type="button"
        className="fb-fab"
        data-open={open ? "true" : "false"}
        aria-expanded={open}
        aria-label={fabLabel}
        onClick={() => (open ? closePanel() : openPanel())}
      >
        {open ? (
          <span aria-hidden="true">✕</span>
        ) : (
          <>
            <span className="fb-dot" aria-hidden="true" />
            <span className="fb-fab__label">{strings.fab}</span>
          </>
        )}
      </button>
    </>
  );
}
