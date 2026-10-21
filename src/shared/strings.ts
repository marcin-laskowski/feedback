/**
 * Every user-visible string (D22). One flat object, keys named for the element.
 *
 * Polish is the default because every consumer today is a Polish site. When a
 * project needs another language, this file grows a second object and the
 * widget takes a `strings` prop – not scattered literals across five
 * components.
 */

import type { FeedbackSeverity, FeedbackType } from "./types";

export const strings = {
  fab: "Zgłoś uwagę",
  fabClose: "Zamknij",

  panelTitle: "Zgłoś uwagę",
  close: "Zamknij",

  // Context strip – a disclosure, not a summary. Everything stored is visible
  // here, which is what makes the transparency claim true rather than decorative.
  stripShow: "Pokaż, co dołączamy do zgłoszenia",
  stripHide: "Ukryj szczegóły",
  stripPage: "strona",
  stripWindow: "okno",
  stripBrowser: "przeglądarka",
  stripLanguage: "język",
  stripErrors: "błędy",
  stripSession: "wizyta",
  stripSessionValue: "anonimowy kod wizyty",
  // Number last, so no form of "wykryty" has to agree with it: "5 wykryte"
  // was wrong and "wykrytych" would need a third branch for 12-14, 22-24, ...
  stripErrorsValue: (count: number) => `wykryte na tej stronie: ${count}`,
  stripNoErrors: "brak",
  stripFooter: "Nie zapisujemy Twojego adresu IP.",

  typeLabel: "Czego dotyczy?",
  severityLabel: "Jak bardzo przeszkadza?",

  whatLabel: "Co się dzieje?",
  whatPlaceholder: "Cennik nie ładuje się po kliknięciu „Zobacz plany”.",
  whyLabel: "Dlaczego to problem?",
  whyPlaceholder: "Nie mogę pokazać oferty klientowi na jutrzejszym spotkaniu.",

  // Asked third, after the report itself: the reporter came to say what is
  // broken, and a form that opens with "who are you" reads as a login.
  reporterLabel: "Kto zgłasza?",
  reporterPlaceholder: "Imię i nazwisko",

  send: "Wyślij",
  sending: "Wysyłam…",

  // Draft restore. An orientation cue, not a banner – it disappears on the
  // first keystroke. Without it, a form that fills itself reads as a form that
  // was already submitted.
  draftRestored: "Wróciliśmy do Twojego szkicu",
  draftDiscard: "Zacznij od nowa",

  successTitle: "Dzięki. Mamy to.",
  successBody: "Zgłoszenie trafiło na listę zgłoszeń.",
  successAgain: "Zgłoś kolejną rzecz",

  // Every failure note says three things in the same order: what happened,
  // that the text is still in the form, what to do now and when. "Został w
  // formularzu" and not "jest zapisany": "zapisany" reads as delivered, which
  // is exactly the wrong thing to say when delivery is what failed. The wait
  // is a number, never "za chwilę": a reader cannot act on "a moment". Where
  // the report ends up is always "lista zgłoszeń", here and in successBody.
  errorSend:
    "Nie udało się wysłać. Twój tekst został w formularzu – spróbuj jeszcze raz albo napisz do nas inaczej.",
  // The sink was writing another report (or stuck on one). Nothing was
  // written, so a retry is safe. Not "kolejka": nothing is queued, and the
  // reporter has to press send again. The route sends Retry-After: 10.
  errorBusy:
    "Nie możemy teraz przyjąć zgłoszenia. Twój tekst został w formularzu – spróbuj za kilkanaście sekund.",
  // The sink did not answer in time. The row may still land, so the sentence
  // says "no confirmation", not "failed".
  errorTimeout:
    "Nie dostaliśmy potwierdzenia. Twój tekst został w formularzu – spróbuj za kilkanaście sekund.",
  // The window is five minutes (RL_WINDOW_MS in the route), so "kilka minut"
  // is always enough.
  errorRateLimited:
    "Za dużo zgłoszeń w krótkim czasie. Twój tekst został w formularzu – spróbuj za kilka minut.",
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
