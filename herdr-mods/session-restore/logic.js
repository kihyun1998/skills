// session-restore's pure logic: the save's shape, the Claude flags it keeps, and the plan for
// opening saved sessions again. It imports nothing from Herdr or Node.

// Claude Code's options that take a value: required, variadic and optional.
const VALUE = new Set(["--agent", "--agents", "--append-system-prompt", "--autocompact", "--debug-file", "--effort", "--environment",
  "--fallback-model", "--input-format", "--json-schema", "--max-budget-usd", "--model", "-n", "--name", "--output-format",
  "--permission-mode", "--permission-prompts", "--plugin-dir", "--plugin-url", "--remote-control-session-name-prefix", "--session-id",
  "--setting-sources", "--settings", "--system-prompt", "--system-prompt-snapshot"]);
const VARIADIC = new Set(["--add-dir", "--allowedTools", "--allowed-tools", "--betas", "--disallowedTools", "--disallowed-tools",
  "--file", "--mcp-config", "--tools"]);
const OPTIONAL = new Set(["--cloud", "-d", "--debug", "--from-pr", "--prompt-suggestions", "--remote-control", "-r", "--resume",
  "--teleport", "-w", "--worktree"]);
// Options that pick a session, or make a new place for it; they are left out of the kept flags.
const DROP = new Set(["-r", "--resume", "-c", "--continue", "--session-id", "--fork-session", "-p", "--print", "--bg",
  "--background", "--from-pr", "--teleport", "--cloud", "-w", "--worktree", "--tmux", "--desktop", "--environment"]);

/** A Claude argv's flags with their values, without the program, the prompt or the session flags. */
export function keptFlags(argv) {
  const words = (argv ?? []).slice(1), out = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === "--") break;
    if (!w.startsWith("-") || w === "-") continue;
    const name = w.split("=", 1)[0], take = [w];
    const next = () => i + 1 < words.length && !words[i + 1].startsWith("-");
    if (!w.includes("=")) {
      if (VALUE.has(name)) { if (i + 1 < words.length) take.push(words[++i]); }
      else if (VARIADIC.has(name)) { while (next()) take.push(words[++i]); }
      else if (OPTIONAL.has(name)) { if (next()) take.push(words[++i]); }
    }
    if (!DROP.has(name)) out.push(...take);
  }
  return out;
}

const base = (p) => String(p ?? "").split(/[\\/]/).pop();
const program = (fg) => fg?.name || base(fg?.argv?.[0]);
/** The terminal's foreground program is Claude Code. */
export const isClaude = (fg) => /^claude(\.exe)?$/i.test(program(fg)) || /^claude(\.exe)?$/i.test(base(fg?.argv?.[0]));
/** The terminal's foreground program is a shell. */
export const isShell = (fg) => /^(pwsh|powershell|cmd|bash|zsh|fish|sh|dash|ksh|nu)(\.exe)?$/i.test(program(fg));

const MIN = 60_000;

/** The settings a missing or unreadable settings file stands for. historyLimit null keeps every save. */
export const DEFAULT_SETTINGS = { saveEveryMinutes: 10, historyLimit: 50, autoSave: true };

/** What the Settings tab lets each number be. A history of 500 saves is about 9 MB at the 18 KB a save took on 2026-11-20. */
export const SETTING_BOUNDS = { saveEveryMinutes: { min: 1, max: 1440 }, historyLimit: { min: 1, max: 500 } };

/** The ASCII digits of what a number field was given, in order. */
export const digitsOnly = (text) => String(text ?? "").replace(/[^0-9]/g, "");

/** A whole number from a field's text or a number, kept within min and max; null for no number. */
export function clampWhole(value, min, max) {
  const n = typeof value === "number" ? value : String(value ?? "").trim() === "" ? NaN : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const whole = (v) => (typeof v === "number" && Number.isFinite(v) && Math.round(v) >= 1 ? Math.round(v) : null);

/** The settings file's text read: each field its default when missing or not a positive number. */
export function parseSettings(text) {
  let raw = null;
  try { raw = JSON.parse(text ?? "null"); } catch {}
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  return {
    saveEveryMinutes: whole(raw.saveEveryMinutes) ?? DEFAULT_SETTINGS.saveEveryMinutes,
    historyLimit: raw.historyLimit === null ? null : whole(raw.historyLimit) ?? DEFAULT_SETTINGS.historyLimit,
    autoSave: raw.autoSave !== false,
  };
}

/** How long a save may age before it reads as stalled: three save intervals. */
export const staleAfter = (minutes) => 3 * minutes * MIN;

/** The stale time of the default interval. */
export const STALE_MS = staleAfter(DEFAULT_SETTINGS.saveEveryMinutes);

/** The core holder's instance id, or the core's pid and start time when no holder is listed. */
export function coreIdentity(status, now = Date.now()) {
  const holder = status?.holder?.current ? status.holder : (status?.holders ?? []).find((h) => h.current);
  if (holder?.instance) return holder.instance;
  return "core-" + status?.pid + "-" + Math.round((now - (status?.uptime_ms ?? 0)) / 1000) * 1000;
}

/** Each observed entry's parentSession: the session of the observed Claude in its parent terminal. */
export function linkParents(observed) {
  const byAddress = new Map(observed.map((o) => [o.address, o]));
  return observed.map((o) => ({ ...o, parentSession: (o.parent && byAddress.get(o.parent)?.sessionId) || null }));
}

const bySession = (list) => {
  const seen = new Set();
  return list.filter((e) => !seen.has(e.sessionId) && seen.add(e.sessionId));
};

/**
 * The next save. current is the Claude sessions alive now, replaced whole each time. On a new core
 * holder (a reboot or core restart), the previous run's last current is set aside into restore,
 * where an entry stays until it is open again (live in current) or removed by hand.
 */
export function nextSave(prev, observed, { core, now }) {
  const current = bySession(linkParents(observed)).map((e) => ({ ...e, key: e.sessionId }));
  let restore = prev?.restore ?? [];
  if (prev?.core && prev.core !== core) restore = bySession([...(prev.current ?? []), ...restore]);
  const live = new Set(current.map((e) => e.sessionId));
  return { version: 1, core, savedAt: now, shownCore: prev?.shownCore ?? null, current, restore: restore.filter((e) => !live.has(e.sessionId)) };
}

/** A save's entries in one list for the panel and planOpen: restore ones closed, current ones live. */
export const entriesOf = (save) => [
  ...(save?.restore ?? []).map((e) => ({ ...e, live: false })),
  ...(save?.current ?? []).map((e) => ({ ...e, live: true })),
];

const working = (e) => e.status === "working";
const workingFirst = (list) => [...list].sort((a, b) => Number(working(b)) - Number(working(a)));

/** The Claude whose terminal started this one, when it is in the list; null for a conductor or a lone session. */
export function conductorOf(e, all) {
  return e.parentSession ? all.find((c) => c !== e && c.sessionId === e.parentSession) ?? null : null;
}

/** A worker opens only with its conductor: one open now, or one in the restore list that can open. */
export function openable(e, all, seen = new Set()) {
  if (!e.parentSession) return true;
  const c = conductorOf(e, all);
  if (!c || seen.has(c.sessionId)) return false;
  return Boolean(c.live) || openable(c, all, new Set([...seen, e.sessionId]));
}

/** The top of the chain of conductors above an entry. */
function rootOf(e, all) {
  const seen = new Set([e.sessionId]);
  let top = e;
  for (let c = conductorOf(top, all); c && !seen.has(c.sessionId); c = conductorOf(top, all)) { seen.add(c.sessionId); top = c; }
  return top;
}

/** An entry and everything it started, depth first, working ones first at each level. */
function tree(root, all, depth = 0, seen = new Set()) {
  if (seen.has(root.sessionId)) return [];
  seen.add(root.sessionId);
  const kids = workingFirst(all.filter((e) => conductorOf(e, all) === root));
  return [{ entry: root, depth, conductor: depth ? conductorOf(root, all)?.sessionId ?? null : null }, ...kids.flatMap((k) => tree(k, all, depth + 1, seen))];
}

/**
 * What opening the selected entries does, in order: each conductor (working ones first), then
 * its workers. A worker brings its conductor; one already open is skipped but still named. A
 * worker whose conductor is in neither list is blocked, never opened alone.
 */
export function planOpen(selected, all) {
  const roots = [], blocked = [];
  for (const picked of selected) {
    const s = all.find((e) => e.sessionId === picked.sessionId) ?? picked;
    if (!openable(s, all)) { blocked.push({ entry: s, conductor: null, skip: false, blocked: true }); continue; }
    const root = rootOf(s, all);
    if (!roots.some((r) => r.sessionId === root.sessionId)) roots.push(root);
  }
  return [...workingFirst(roots).flatMap((root) => tree(root, all).map((n) => ({ entry: n.entry, conductor: n.conductor, skip: Boolean(n.entry.live) }))), ...blocked];
}

/**
 * Where a new terminal for the entry goes: its saved labels, and the renames that give a space or
 * tab Herdr makes anew the name somebody had given it.
 */
export function placement(e, spaces) {
  const sp = e.labels?.["herdr.space"], tb = e.labels?.["herdr.tab"];
  const space = (spaces ?? []).find((s) => s.id === sp);
  const renames = [];
  if (sp && !space && e.spaceNamed && e.spaceName) renames.push({ command: "space.rename", args: { id: sp, name: e.spaceName } });
  if (tb && !(space?.tabs ?? []).some((t) => t.id === tb) && e.tabNamed && e.tabName) renames.push({ command: "tab.rename", args: { id: tb, name: e.tabName } });
  return { labels: { ...(e.labels ?? {}) }, renames };
}

/** The command that reopens the entry's session. */
export const resumeArgv = (e) => ["claude", "--resume", e.sessionId, ...(e.flags ?? [])];

const SAFE = /^[A-Za-z0-9_\-.\/:=]+$/;

/** A word quoted the way a Windows program reads its command line. */
function windowsQuote(w) {
  let out = '"', slashes = 0;
  for (const ch of w) {
    if (ch === "\\") { slashes++; continue; }
    out += "\\".repeat(ch === '"' ? slashes * 2 + 1 : slashes) + ch;
    slashes = 0;
  }
  return out + "\\".repeat(slashes * 2) + '"';
}

/**
 * An argv as one line for the named shell to run, quoting only the words that need it. PowerShell
 * gets the words after --%, which it passes to the program unparsed.
 */
export function shellLine(argv, shell) {
  const kind = program({ name: shell }).toLowerCase().replace(/\.exe$/, "");
  if (argv.every((w) => SAFE.test(w))) return argv.join(" ");
  const win = (w) => (SAFE.test(w) ? w : windowsQuote(w));
  if (kind === "pwsh" || kind === "powershell") return [argv[0], "--%", ...argv.slice(1).map(win)].join(" ");
  if (kind === "cmd") return argv.map(win).join(" ");
  return argv.map((w) => (SAFE.test(w) ? w : "'" + w.replace(/'/g, "'\\''") + "'")).join(" ");
}

/** What the chip and the panel need, small enough to share; sig changes with the entries. */
export function summarize(save, { now, failed, staleMs = STALE_MS }) {
  const all = entriesOf(save), restore = all.filter((e) => !e.live);
  return {
    restorable: restore.filter((e) => openable(e, all)).length,
    working: restore.filter((e) => openable(e, all) && working(e)).length,
    saved: all.length - restore.length,
    stalled: Boolean(failed) || (typeof save?.savedAt === "number" && now - save.savedAt > staleMs),
    sig: all.map((e) => e.key + ":" + (e.live ? 1 : 0)).sort().join(","),
  };
}

/**
 * The chip's label and dot for a summary (null: no save yet), or for an open under way
 * ({ opened, total }). sinceSave is how long ago the chip's last save ended, in ms; longer than
 * staleMs reads as stalled. saving is whether a save runs now. The order: an open under way, a
 * stalled save (red), a save running (spin, its dot the color the count would have), then what can
 * be restored (amber) and the count saved (green). With autoSave false no age reads as stalled, and
 * "Auto save off" (dim) takes the place of the count saved and of no save yet.
 */
export function chipState(summary, opening = null, sinceSave = 0, staleMs = STALE_MS, saving = false, autoSave = true) {
  if (opening?.total > 0) return { label: "Opening " + opening.opened + "/" + opening.total, dot: "green" };
  if (summary?.stalled || (autoSave && sinceSave > staleMs)) return { label: "Save stalled", dot: "red" };
  if (saving) return { label: "Saving", dot: !summary ? "dim" : summary.restorable > 0 ? "amber" : "green", spin: true };
  if (summary?.restorable > 0) return { label: summary.restorable + " to restore", dot: "amber" };
  if (!autoSave) return { label: "Auto save off", dot: "dim" };
  if (!summary) return { label: "Not saved yet", dot: "dim" };
  return { label: "⟲ " + summary.saved, dot: "green" };
}

/**
 * The open under way, counted over its batch (the keys it set out to open): { opened, total }, or
 * null when no key of the batch is still opening. states maps a key to { at }.
 */
export function openProgress(states, batch) {
  const keys = [...(batch ?? [])];
  if (!keys.some((k) => states.get(k)?.at === "opening")) return null;
  return { opened: keys.filter((k) => states.get(k)?.at === "opened").length, total: keys.length };
}

/**
 * An open of the selected entries starting as open number id: every row planOpen will open, the
 * conductors and workers it brings along included, marked opening by id and added to the batch
 * under way, or to a new batch when none is. Returns the next { states, batch }.
 */
export function startOpen(states, batch, selected, all, id) {
  const next = new Map(states), keys = openProgress(states, batch) ? new Set(batch) : new Set();
  for (const n of planOpen(selected, all)) {
    if (n.skip) continue;
    keys.add(n.entry.key);
    next.set(n.entry.key, { at: "opening", open: id });
  }
  return { states: next, batch: keys };
}

/** The states once open number id has ended: the rows it left opening cleared, another open's kept. */
export function endOpen(states, id) {
  return new Map([...states].filter(([, s]) => !(s.at === "opening" && s.open === id)));
}

/**
 * The entries as an open sees them, with this panel's marks (states maps a key to { at }): a row
 * marked opened is live at the address it opened at, and one marked opening is live with no
 * address. planOpen skips both, and a worker under the second fails as its conductor did not open.
 * A row marked failed stays closed at the address the failed open watched, so the next open looks
 * at that terminal first.
 */
export function withMarks(entries, states) {
  return entries.map((e) => {
    const s = states?.get(e.key);
    if (s?.at === "opened") return { ...e, live: true, address: s.address ?? e.address };
    if (s?.at === "opening") return { ...e, live: true, address: null };
    if (s?.at === "failed" && s.address) return { ...e, address: s.address };
    return e;
  });
}

/**
 * The states once open number id has a result for a row: written only where that open still marks
 * the row opening. An opened mark carries when it landed (now); a failed one the address it watched.
 */
export function settleOpen(states, id, r, now) {
  const s = states.get(r.key);
  if (s?.at !== "opening" || s.open !== id) return states;
  const next = new Map(states);
  next.set(r.key, r.ok ? { at: "opened", address: r.address, since: now } : { at: "failed", reason: r.reason, ...(r.address ? { address: r.address } : {}) });
  return next;
}

const plural = (list, one, many) => (list.length === 1 ? one : many);
const ACTIONS = {
  delete: { place: "history", failed: (ids) => plural(ids, "Save " + ids[0] + " was", "Saves " + ids.join(", ") + " were") + " not deleted" },
  remove: { place: "sessions", failed: (keys) => plural(keys, "The session is", keys.length + " sessions are") + " still in the save" },
  refresh: { place: "sessions", single: true, failed: () => "The refresh did not finish" },
  check: { single: true },
  save: { place: "sessions", single: true, failed: () => "The save did not run" },
  load: { place: "sessions", single: true, failed: () => "Could not read the save, the history or the settings" },
  settings: { place: "settings", failed: () => "The settings change did not finish" },
};

/**
 * What the panel has under way and the last error of each tab: { busy, errors }, busy a set of
 * action:target keys, errors a tab to its message. Every action of the panel that waits joins it.
 */
export const IDLE = Object.freeze({ busy: new Set(), errors: Object.freeze({}) });

const busyKey = (action, target) => action + ":" + String(target ?? "");

/** Whether the action is under way on the target (null for an action with no target). */
export const busyWith = (act, action, target = null) => act.busy.has(busyKey(action, target));

/** Whether the action is under way on any target. */
export const anyBusy = (act, action) => [...act.busy].some((k) => k.startsWith(action + ":"));

/**
 * The targets a press of the action may still start: those not under way, or none while an
 * action that runs one at a time (save, refresh, the open check, the first read) is under way. An
 * empty list is a press ignored.
 */
export const free = (act, action, targets) =>
  ACTIONS[action].single && anyBusy(act, action) ? [] : targets.filter((t) => !busyWith(act, action, t));

/** The activity with the action under way on the targets. */
export const begin = (act, action, targets) => ({ busy: new Set([...act.busy, ...targets.map((t) => busyKey(action, t))]), errors: act.errors });

/**
 * A press of the action on the targets: { act, go }, go the targets it starts (free). When go is
 * empty the press is ignored and act is the one given; otherwise the targets are under way and the
 * error of the action's tab is cleared, unless clear is false (a refresh the panel runs as it
 * unfolds) or the action has no tab (the Open check, whose failure the rows show).
 */
export function press(act, action, targets, { clear = true } = {}) {
  const go = free(act, action, targets);
  const { place } = ACTIONS[action];
  return go.length ? { act: begin(clear ? dismiss(act, place) : act, action, go), go } : { act, go };
}

/**
 * The activity once the action ended on the targets; error, when given, is kept for its tab, after
 * the error already there, which only a press there or a close clears.
 */
export function finish(act, action, targets, error = null) {
  const done = new Set(targets.map((t) => busyKey(action, t)));
  const busy = new Set([...act.busy].filter((k) => !done.has(k)));
  const { place, failed } = ACTIONS[action];
  if (error == null || !failed) return { busy, errors: act.errors };
  const text = failed(targets) + ": " + error;
  return { busy, errors: { ...act.errors, [place]: act.errors[place] ? act.errors[place] + ". " + text : text } };
}

/** The error kept for a tab, or null. */
export const errorAt = (act, place) => act.errors[place] ?? null;

/** The activity with a tab's error closed. */
export function dismiss(act, place) {
  const { [place]: _, ...errors } = act.errors;
  return { busy: act.busy, errors };
}

/** The sessions a save lists live: session id to address. */
export const liveOf = (save) => new Map((save?.current ?? []).map((e) => [e.sessionId, e.address]));

/**
 * The states with every opened mark that a look at the terminals made at time at shows gone: one
 * whose session running (session id to address) does not hold at the mark's address. Other marks,
 * and opened marks newer than the look, stay.
 */
export function keepLive(states, running, at) {
  if (typeof at !== "number") return states;
  return new Map([...states].filter(([k, s]) => !(s.at === "opened" && !(s.since > at) && running.get(k) !== s.address)));
}

export function withLook(view, look) {
  if (view.lookAt != null && look.at < view.lookAt) return view;
  return { states: keepLive(view.states, look.running, look.at), running: look.running, lookAt: look.at };
}

export const ifUnchanged = (shown, seen, next) => (shown === seen ? next : shown);

export const afterDelete = ({ picked, expanded }, ids) => ({
  picked: picked.filter((p) => !ids.includes(p)),
  expanded: ids.includes(expanded) ? null : expanded,
});

/** The states once rows are taken out of the panel: their results forgotten, an open's opening mark left to that open. */
export function withoutRows(states, keys) {
  const gone = new Set(keys);
  return new Map([...states].filter(([k, s]) => !gone.has(k) || s.at === "opening"));
}

/** A row the panel can still open: closed, openable, and not marked opened by this panel. */
export const reopenable = (e, all, states) => !e.live && openable(e, all) && states?.get(e.key)?.at !== "opened";

/**
 * How the batch's open ended for its rows: { opened, failed }, each a list of keys, or null when no
 * key of the batch is opened or failed. states maps a key to { at }.
 */
export function batchResult(states, batch) {
  const keys = [...(batch ?? [])];
  const opened = keys.filter((k) => states.get(k)?.at === "opened"), failed = keys.filter((k) => states.get(k)?.at === "failed");
  return opened.length || failed.length ? { opened, failed } : null;
}

function spaceOf(groups, entry) {
  const id = entry.labels?.["herdr.space"] ?? "";
  if (!groups.has(id)) groups.set(id, { id, name: entry.spaceName || "", rows: [] });
  return groups.get(id);
}

/**
 * The panel's groups: one per space, spaces with restorable working sessions first. A group's open
 * is the rows its Open · N opens, the ones reopenable() leaves; states maps a key to { at }.
 */
export function groupsOf(entries, states = new Map()) {
  const groups = new Map();
  const roots = entries.filter((e) => !conductorOf(e, entries));
  for (const root of workingFirst(roots)) {
    const rows = spaceOf(groups, root).rows;
    for (const n of tree(root, entries)) rows.push({ entry: n.entry, worker: n.depth > 0, depth: n.depth });
  }
  const list = [...groups.values()].map((g) => {
    const open = g.rows.map((r) => r.entry).filter((e) => reopenable(e, entries, states));
    return { ...g, open, restorable: open.length, working: open.filter(working).length };
  });
  return list.sort((a, b) => b.working - a.working);
}

/** A space's share of the batch being opened: { opened, total } over the group's rows in the batch. */
export function groupProgress(group, states, batch) {
  const keys = group.rows.map((r) => r.entry.key).filter((k) => batch?.has(k));
  return { opened: keys.filter((k) => states.get(k)?.at === "opened").length, total: keys.length };
}

/**
 * The entries as the terminals hold them now: live when running (session id to address) holds the
 * session, at that address. Nothing is saved; it is the panel's refresh.
 */
export const withRunning = (entries, running) =>
  entries.map((e) => (running.has(e.sessionId) ? { ...e, live: true, address: running.get(e.sessionId) } : { ...e, live: false }));

const segments = (p) => String(p ?? "").toLowerCase().split(/[\\/]+/).filter(Boolean);

/**
 * What the panel does with a batch watchFolder(dir) gave: "released" on [] (the watch was cancelled,
 * as when the copy closes, or possibly reclaimed: the d.ts does not say how a reclaim ends), "reload" when it holds dir itself or one of files (the ones the panel
 * reads again), else "skip" (other files, as other mods'). A path is read by its last segments, as
 * the d.ts promises only absolute paths, not their form: dir is a path ending in dir's last two
 * segments, and a file one in dir's last segment then the file's name, or that name with a suffix,
 * as an atomic write's temporary file.
 */
export function folderChange(paths, dir, files) {
  if (!paths.length) return "released";
  const [parent, folder] = segments(dir).slice(-2), names = files.map((f) => segments(f).pop());
  const ours = (p) => {
    const s = segments(p), [a, b] = s.slice(-2);
    return (a === parent && b === folder) || (a === folder && names.some((n) => b.startsWith(n)));
  };
  return paths.some(ours) ? "reload" : "skip";
}

/**
 * The overlay spec the merge dialog opens with. Its own key and keep false: Herdr may fill an
 * overlay's key and keep from mod.json, whose key is the chip's, and a second window with that key
 * replaces the chip.
 */
export const mergeDialog = (ids) =>
  ({ mod: "session-restore", props: { view: "merge", ids }, kind: "dialog", key: "session-restore.merge", keep: false, width: 760, height: 640 });

/**
 * The save history's text read: { version, saves, lastId }, saves newest first, empty when there is
 * none or it does not parse. lastId, the highest id the history has given, is as the file holds it,
 * and missing in a history from before it or with no save yet.
 */
export function parseHistory(text) {
  try {
    const h = JSON.parse(text ?? "null");
    if (h && Array.isArray(h.saves)) return h;
  } catch {}
  return { version: 1, saves: [] };
}

const idsOf = (entries) => entries.map((e) => e.sessionId).sort().join("\n");
const usableId = (v) => Number.isInteger(v) && v >= 1 && v < Number.MAX_SAFE_INTEGER;
const highestId = (history) => Math.max(0, ...[history.lastId, ...history.saves.map((s) => s.id)].filter(usableId));
const nextId = (history) => highestId(history) + 1;

/** The history with only its newest limit saves; the same history with no limit. */
export const trimHistory = (history, limit) =>
  limit == null || history.saves.length <= limit ? history : { ...history, saves: history.saves.slice(0, limit) };

/** How many saves a limit would drop. */
export const overLimit = (history, limit) => (limit == null ? 0 : Math.max(0, history.saves.length - limit));

/**
 * The history with the sessions alive now added as a new save, kept to limit. The same history when
 * there are none, or when they are the same sessions as the newest save.
 */
export function withSnapshot(history, entries, { now, limit }) {
  if (!entries.length) return history;
  if (history.saves[0] && idsOf(history.saves[0].entries) === idsOf(entries)) return history;
  const id = nextId(history);
  return trimHistory({ ...history, lastId: id, saves: [{ id, at: now, entries }, ...history.saves] }, limit);
}

/**
 * The history without the saves with the given ids; its lastId stays the highest id it has given, so
 * no id comes back. The same history when it has none of them and its lastId is already that.
 */
export function withoutSnapshots(history, ids) {
  if (history.lastId === highestId(history) && !history.saves.some((s) => ids.includes(s.id))) return history;
  return { ...history, lastId: highestId(history), saves: history.saves.filter((s) => !ids.includes(s.id)) };
}

/**
 * Every session of the saves once, newest save first: { entry, in }, entry its record in the newest
 * save that has it, in the ids of the saves that have it, newest first.
 */
export function mergeSessions(saves) {
  const rows = new Map();
  for (const s of [...saves].sort((a, b) => b.at - a.at)) {
    for (const e of s.entries) {
      if (!rows.has(e.sessionId)) rows.set(e.sessionId, { entry: e, in: [] });
      rows.get(e.sessionId).in.push(s.id);
    }
  }
  return [...rows.values()];
}

/**
 * The merge's rows (mergeSessions) by space, as groupsOf() groups the panel's: { id, name, rows },
 * id the herdr.space label, name its first row's space name, in the order the spaces first show.
 */
export function mergeGroups(rows) {
  const groups = new Map();
  for (const r of rows) spaceOf(groups, r.entry).rows.push(r);
  return [...groups.values()];
}

/** The ids, in their order, of the saves the history no longer has. */
export const goneSaves = (history, ids) => ids.filter((id) => !history.saves.some((s) => s.id === id));

/**
 * The history with a new save of the sessions in keep (session ids) from the saves with the given
 * ids (mergeSessions), deleting no save, so it may go over the history limit. The same history
 * when one of the saves is gone (goneSaves), fewer than two are given, or nothing is kept.
 */
export function mergeSnapshots(history, ids, keep, { now }) {
  if (goneSaves(history, ids).length) return history;
  const saves = history.saves.filter((s) => ids.includes(s.id));
  const entries = mergeSessions(saves).filter((r) => keep.includes(r.entry.sessionId)).map((r) => r.entry);
  if (saves.length < 2 || !entries.length) return history;
  const from = saves.map((s) => s.id).sort((a, b) => a - b);
  const id = nextId(history);
  return { ...history, lastId: id, saves: [{ id, at: now, from, entries }, ...history.saves] };
}

/** A terminal title without what an agent puts before it (a status glyph, a [ ! ] mark). */
export const cleanTitle = (s) => (s ?? "").replace(/^[^\p{L}\p{N}\p{Ps}\p{Pi}]+/u, "").replace(/^\[ [!.] \] /, "").trim();
