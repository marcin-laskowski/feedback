"use client";

/**
 * The mount. Renders nothing into the host tree — it creates a shadow root on
 * `document.body` and starts a second React root inside it.
 *
 * Why a second root rather than a portal: the widget must not inherit the host
 * app's providers, its CSS cascade, or its design system. It is a tool sitting
 * on top of the site. The cost of that isolation is that no Next hook works
 * inside — `usePathname`, `useSearchParams` and friends are unavailable, which
 * is why `nav.ts` patches history and the deep link reads `window.location`.
 */

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { CSS } from "./styles";
import { Widget, type Reveal } from "./Widget";

export type FeedbackWidgetProps = {
  /** Written to the `project` column. One value per site. */
  project: string;
  /** Build-time kill switch. Off means nothing mounts and nothing ships. */
  enabled?: boolean;
  /**
   * `always` — the trigger is visible to everyone.
   * `invited` — hidden until someone arrives on `?feedback=open`, then
   * remembered in localStorage. Use this on a production site whose visitors
   * are customers rather than reporters.
   */
  reveal?: Reveal;
  /** Route handler mounted from `@unhyped/feedback/server`. */
  endpoint?: string;
};

export function FeedbackWidget({
  project,
  enabled = true,
  reveal = "always",
  endpoint = "/api/feedback",
}: FeedbackWidgetProps) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const host = document.createElement("div");
    host.setAttribute("data-feedback-widget", "");
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);

    const mount = document.createElement("div");
    shadow.appendChild(mount);

    const root = createRoot(mount);
    root.render(
      <Widget project={project} endpoint={endpoint} reveal={reveal} shadowRoot={shadow} />
    );

    return () => {
      // Deferred: unmounting a root synchronously from an effect cleanup runs
      // while React is still rendering the parent tree.
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 0);
    };
  }, [enabled, project, reveal, endpoint]);

  return null;
}
