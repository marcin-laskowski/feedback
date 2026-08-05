/**
 * Every user-visible string (D22). One flat object, keys named for the element.
 *
 * Polish is the default because every consumer today is a Polish site. When a
 * project needs another language, this file grows a second object and the
 * widget takes a `strings` prop — not scattered literals across five
 * components.
 */

import type { FeedbackSeverity, FeedbackType } from "./types";

export const strings = {
  fab: "Zgłoś uwagę",
  fabClose: "Zamknij",

  panelTitle: "Zgłoś uwagę",
  close: "Zamknij",

  // Context strip — a disclosure, not a summary. Everything stored is visible
  // here, which is what makes the transparency claim true rather than decorative.
  stripShow: "Pokaż, co zbieramy",
  stripHide: "Ukryj szczegóły",
  stripPage: "strona",
  stripWindow: "okno",
  stripBrowser: "przeglądarka",
  stripLanguage: "język",
  stripErrors: "błędy",
  stripSession: "sesja",
  stripSessionValue: "anonimowy identyfikator",
  stripErrorsValue: (count: number) =>
    count === 1 ? "1 wykryty na tej stronie" : `${count} wykryte na tej stronie`,
  stripNoErrors: "brak",
  stripFooter: "Nie zapisujemy Twojego adresu IP.",

  typeLabel: "Czego dotyczy?",
  severityLabel: "Jak bardzo przeszkadza?",

  whatLabel: "Co się dzieje?",
  whatPlaceholder: "Cennik nie ładuje się po kliknięciu „Zobacz plany”.",
  whyLabel: "Dlaczego to problem?",
  whyPlaceholder: "Nie mogę pokazać oferty klientowi na jutrzejszym spotkaniu.",

  send: "Wyślij",
  sending: "Wysyłam…",

  // Draft restore. An orientation cue, not a banner — it disappears on the
  // first keystroke. Without it, a form that fills itself reads as a form that
  // was already submitted.
  draftRestored: "Wróciliśmy do Twojego szkicu",
  draftDiscard: "Zacznij od nowa",

  successTitle: "Dzięki. Mamy to.",
  successBody: "Zgłoszenie trafiło na listę.",
  successAgain: "Zgłoś kolejną rzecz",

  errorSend: "Nie udało się wysłać. Twój tekst jest zapisany — spróbuj jeszcze raz.",
  errorRateLimited: "Za dużo zgłoszeń z tego adresu. Spróbuj za chwilę.",
  errorValidation: "Uzupełnij zaznaczone pola.",
} as const;

export const typeLabels: Record<FeedbackType, string> = {
  bug: "Błąd",
  idea: "Pomysł",
  copy: "Treść",
  design: "Wygląd",
};

export const severityLabels: Record<FeedbackSeverity, string> = {
  blocker: "Blokuje mnie",
  annoying: "Irytuje",
  minor: "Drobiazg",
};
