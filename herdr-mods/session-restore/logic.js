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

/** How long a save may age before the tab bar's save reads as stalled. */
export const STALE_MS = 3 * 60_000;

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

/** What the tab bar's dot and the panel need, small enough to share; sig changes with the entries. */
export function summarize(save, { now, failed }) {
  const all = entriesOf(save), restore = all.filter((e) => !e.live);
  return {
    restorable: restore.filter((e) => openable(e, all)).length,
    working: restore.filter((e) => openable(e, all) && working(e)).length,
    saved: all.length - restore.length,
    stalled: Boolean(failed) || (typeof save?.savedAt === "number" && now - save.savedAt > STALE_MS),
    sig: all.map((e) => e.key + ":" + (e.live ? 1 : 0)).sort().join(","),
  };
}

/** The panel's groups: one per space, spaces with restorable working sessions first. */
export function groupsOf(entries) {
  const groups = new Map();
  const roots = entries.filter((e) => !conductorOf(e, entries));
  for (const root of workingFirst(roots)) {
    const id = root.labels?.["herdr.space"] ?? "";
    if (!groups.has(id)) groups.set(id, { id, name: root.spaceName || "", rows: [] });
    for (const n of tree(root, entries)) groups.get(id).rows.push({ entry: n.entry, worker: n.depth > 0, depth: n.depth });
  }
  const list = [...groups.values()].map((g) => {
    const restorable = g.rows.filter((r) => !r.entry.live && openable(r.entry, entries));
    return { ...g, restorable: restorable.length, working: restorable.filter((r) => working(r.entry)).length };
  });
  return list.sort((a, b) => b.working - a.working);
}
