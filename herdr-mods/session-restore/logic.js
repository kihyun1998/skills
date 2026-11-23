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

/** Each observed entry's parentSession: the session of the observed Claude in its parent terminal. */
export function linkParents(observed) {
  const byAddress = new Map(observed.map((o) => [o.address, o]));
  return observed.map((o) => ({ ...o, parentSession: (o.parent && byAddress.get(o.parent)?.sessionId) || null }));
}

const bySession = (list) => {
  const seen = new Set();
  return list.filter((e) => !seen.has(e.sessionId) && seen.add(e.sessionId));
};

/** The save: the Claude sessions alive now, replacing whatever the file held. */
export function nextSave(observed, { now }) {
  return { version: 2, savedAt: now, sessions: bySession(linkParents(observed)).map((e) => ({ ...e, key: e.sessionId })) };
}

/** A save's sessions in one list for the panel and planOpen. */
export const entriesOf = (save) => [...(save?.sessions ?? [])];

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

/** How long ago, as the chip and the panel say it. */
export function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.round(s / 60);
  return m < 60 ? m + "m ago" : Math.round(m / 60) + "h ago";
}

/** What the chip and the panel show of a save: how many sessions it holds, when, and whether the last save failed. */
export function summarize(save, { failed = false } = {}) {
  return { saved: save?.sessions?.length ?? 0, savedAt: typeof save?.savedAt === "number" ? save.savedAt : null, failed: Boolean(failed) };
}

/**
 * The chip's label and dot for a summary, or for an open under way ({ opened, total }). The order:
 * an open under way, a save running (spin), a failed save (red), no save yet (dim), then how long
 * ago the save was made.
 */
export function chipState(summary, { opening = null, saving = false, now = Date.now() } = {}) {
  if (opening?.total > 0) return { label: "Opening " + opening.opened + "/" + opening.total, dot: "green" };
  if (saving) return { label: "Saving", dot: "dim", spin: true };
  if (summary?.failed) return { label: "Save failed", dot: "red" };
  if (summary?.savedAt == null) return { label: "Not saved", dot: "dim" };
  return { label: "Saved " + ago(now - summary.savedAt), dot: "green" };
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
  remove: { place: "sessions", failed: (keys) => plural(keys, "The session is", keys.length + " sessions are") + " still in the save" },
  save: { place: "sessions", single: true, failed: () => "The save did not run" },
  load: { place: "sessions", single: true, failed: () => "Could not read the save" },
  look: { place: "sessions", single: true, failed: () => "Could not check which sessions are open" },
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
 * action that runs one at a time (save, the first read, the look at the terminals) is under way. An
 * empty list is a press ignored.
 */
export const free = (act, action, targets) =>
  ACTIONS[action].single && anyBusy(act, action) ? [] : targets.filter((t) => !busyWith(act, action, t));

/** The activity with the action under way on the targets. */
export const begin = (act, action, targets) => ({ busy: new Set([...act.busy, ...targets.map((t) => busyKey(action, t))]), errors: act.errors });

/**
 * A press of the action on the targets: { act, go }, go the targets it starts (free). When go is
 * empty the press is ignored and act is the one given; otherwise the targets are under way and the
 * error of the action's tab is cleared.
 */
export function press(act, action, targets) {
  const go = free(act, action, targets);
  const { place } = ACTIONS[action];
  return go.length ? { act: begin(dismiss(act, place), action, go), go } : { act, go };
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

/**
 * The turns once a result numbered n (io.turn()) reaches a field of the panel: { turns, take }. A
 * result, a write's or a read's, is taken only when it is numbered after every one the field has
 * taken.
 */
export function arrive(turns, field, n) {
  if (n <= turns[field]) return { turns, take: false };
  return { turns: { ...turns, [field]: n }, take: true };
}

/** The states once rows are taken out of the panel: their results forgotten, an open's opening mark left to that open. */
export function withoutRows(states, keys) {
  const gone = new Set(keys);
  return new Map([...states].filter(([k, s]) => !gone.has(k) || s.at === "opening"));
}

/**
 * The entries as the terminals hold them now: live when running (session id to address) holds the
 * session, at that address. It reads; nothing is saved.
 */
export const withRunning = (entries, running) =>
  entries.map((e) => (running.has(e.sessionId) ? { ...e, live: true, address: running.get(e.sessionId) } : { ...e, live: false }));

/** The states once a look at the terminals made at time at lands: an opened mark from before it is dropped, as the look shows where it runs. */
export const afterLook = (states, at) => new Map([...states].filter(([, s]) => !(s.at === "opened" && !(s.since > at))));

/** A row the panel can still open: openable, and not marked opened or opening by this panel. */
export const reopenable = (e, all, states) => !e.live && openable(e, all) && !["opened", "opening"].includes(states?.get(e.key)?.at);

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
 * Where the panel unfolds: "below" the chip when the press landed in the top half of the window
 * (y and height in window pixels), else "above". No height, as before the first frame, reads as above.
 */
export const panelSide = (y, height) => (height > 0 && y < height / 2 ? "below" : "above");

/** A terminal title without what an agent puts before it (a status glyph, a [ ! ] mark). */
export const cleanTitle = (s) => (s ?? "").replace(/^[^\p{L}\p{N}\p{Ps}\p{Pi}]+/u, "").replace(/^\[ [!.] \] /, "").trim();
