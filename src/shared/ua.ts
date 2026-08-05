/**
 * User-agent parsing. Pure function over a string, no I/O — which is exactly
 * why it lives in shared/ (D18).
 *
 * The context strip renders this at panel-open time, so it has to run in the
 * browser. The server runs the SAME function over the raw UA it receives and
 * writes its own result, never the client's — a client can put anything it
 * likes in `context.browser`.
 *
 * This is deliberately shallow. It has to be right about the five browsers and
 * four platforms a Polish B2B site actually sees; it does not have to be a
 * UA database.
 */

import type { DeviceKind } from "./types";

export type ParsedUA = {
  browser: string;
  os: string;
  device: DeviceKind;
};

export function parseUserAgent(raw: string): ParsedUA {
  const ua = typeof raw === "string" ? raw : "";
  return { browser: browserOf(ua), os: osOf(ua), device: deviceOf(ua) };
}

// Order matters: Edge and Opera both carry "Chrome", Chrome carries "Safari".
const BROWSERS: Array<[name: string, test: RegExp, version: RegExp]> = [
  ["Edge", /\bEdg[A-Z]?\//, /\bEdg[A-Z]?\/(\d+)/],
  ["Opera", /\bOPR\//, /\bOPR\/(\d+)/],
  ["Samsung Internet", /SamsungBrowser\//, /SamsungBrowser\/(\d+)/],
  ["Firefox", /\bFirefox\//, /\bFirefox\/(\d+)/],
  ["Chrome", /\bChrome\//, /\bChrome\/(\d+)/],
  ["Safari", /\bSafari\//, /\bVersion\/(\d+)/],
];

function browserOf(ua: string): string {
  for (const [name, test, version] of BROWSERS) {
    if (!test.test(ua)) continue;
    const major = version.exec(ua)?.[1];
    return major ? `${name} ${major}` : name;
  }
  return "nieznana przeglądarka";
}

function osOf(ua: string): string {
  if (/\bWindows NT 10/.test(ua)) return "Windows 10/11";
  if (/\bWindows NT/.test(ua)) return "Windows";
  if (/\biPhone|\biPad|\biPod/.test(ua)) {
    const v = /OS (\d+)[._](\d+)/.exec(ua);
    return v ? `iOS ${v[1]}.${v[2]}` : "iOS";
  }
  if (/\bMac OS X/.test(ua)) {
    // Safari has reported 10_15_7 for every macOS since Catalina. Reporting a
    // wrong number is worse than reporting none, so we drop the version.
    return "macOS";
  }
  if (/\bAndroid/.test(ua)) {
    const v = /Android (\d+)/.exec(ua);
    return v ? `Android ${v[1]}` : "Android";
  }
  if (/\bLinux/.test(ua)) return "Linux";
  return "nieznany system";
}

function deviceOf(ua: string): DeviceKind {
  if (/\biPad|Tablet|PlayBook|Silk/.test(ua)) return "tablet";
  // Android without "Mobile" is a tablet — the token is the only reliable signal.
  if (/\bAndroid\b/.test(ua) && !/\bMobile\b/.test(ua)) return "tablet";
  if (/\bMobi|\biPhone|\biPod|Windows Phone/.test(ua)) return "mobile";
  return "desktop";
}
