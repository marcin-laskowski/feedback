"use client";

/**
 * The context strip. A disclosure, not a summary.
 *
 * The strip's whole justification is "showing the captured data beats a
 * sentence claiming you capture it". A strip that shows four things while the
 * payload stores twenty is a transparency gesture, which is worse than an
 * honest disclaimer. Expanded, this lists everything that leaves the browser,
 * in the reporter's own language — which is also why it replaces the privacy
 * notice under the submit button.
 *
 * It renders `pathname` and never the query string (D20): a URL can be
 * `/reset-password?token=eyJ…`, and this element is on screen next to whoever
 * is standing behind the reporter.
 */

import type { FeedbackContext } from "../shared/types";
import { strings } from "../shared/strings";

type Props = {
  context: FeedbackContext;
  expanded: boolean;
  onToggle: () => void;
};

export function ContextStrip({ context, expanded, onToggle }: Props) {
  const summary = [context.pathname, context.viewport, context.browser, context.os]
    .filter(Boolean)
    .join(" · ");

  const errorCount = context.consoleErrors.length;

  return (
    <div className="fb-strip">
      <button
        type="button"
        className="fb-strip__toggle"
        aria-expanded={expanded}
        aria-label={expanded ? strings.stripHide : strings.stripShow}
        onClick={onToggle}
      >
        <span className="fb-strip__summary">{summary}</span>
        <span className="fb-strip__chevron" aria-hidden="true">
          ⌄
        </span>
      </button>

      {expanded && (
        <div className="fb-strip__detail">
          <Row label={strings.stripPage} value={context.pathname} />
          <Row label={strings.stripWindow} value={`${context.viewport} · ${context.screen}`} />
          <Row label={strings.stripBrowser} value={`${context.browser} · ${context.os}`} />
          <Row label={strings.stripLanguage} value={`${context.language} · ${context.timezone}`} />
          <Row
            label={strings.stripErrors}
            value={errorCount ? strings.stripErrorsValue(errorCount) : strings.stripNoErrors}
          />
          <Row label={strings.stripSession} value={strings.stripSessionValue} />
          <div className="fb-strip__foot">{strings.stripFooter}</div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="fb-strip__row">
      <span className="fb-strip__key">{label}</span>
      <span className="fb-strip__value">{value}</span>
    </div>
  );
}
