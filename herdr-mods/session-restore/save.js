// The save: the Claude session each live terminal holds, and the restore list, in the app's
// data folder, with the save history and the settings beside it, and the chip's cadence for it.
import { coreIdentity, DEFAULT_SETTINGS, goneSaves, isClaude, keptFlags, mergeSnapshots, nextSave, parseHistory, parseSettings, staleAfter, summarize, trimHistory, withSnapshot, withoutSnapshots } from "./logic.js";

const trimEnd = (path) => String(path).replace(/[\\/]+$/, "");

/** Where the whole save lives. */
export const savePath = (appHome) => trimEnd(appHome) + "/data/session-restore.json";
/** Where the save history lives: past saves, newest first. */
export const historyPath = (appHome) => trimEnd(appHome) + "/data/session-restore.history.json";
/** Where the settings live: the save interval in minutes and the history limit. */
export const settingsPath = (appHome) => trimEnd(appHome) + "/data/session-restore.settings.json";
/** Claude Code's file for a running process: { sessionId, cwd, name, status, ... }. */
export const pidFile = (home, pid) => trimEnd(home) + "/.claude/sessions/" + pid + ".json";

/** Claude Code's folder name for a project folder: every character but a letter or digit as "-". */
const projectDir = (cwd) => String(cwd).replace(/[^a-zA-Z0-9]/g, "-");

/**
 * Whether a session has a conversation: a transcript, ~/.claude/projects/<any folder>/<id>.jsonl.
 * Claude writes it with the first message. The folder named from cwd is looked in first; the
 * others are listed only when it is not there, once per save through seen.
 */
async function hasTranscript(io, cwd, id, seen) {
  const root = trimEnd(io.home) + "/.claude/projects";
  if (cwd && (await io.exists(root + "/" + projectDir(cwd) + "/" + id + ".jsonl"))) return true;
  seen.ids ??= (async () => {
    const ids = new Set();
    for (const dir of await io.list(root)) {
      if (!dir.isDirectory()) continue;
      for (const f of await io.list(root + "/" + dir.name)) if (f.name.endsWith(".jsonl")) ids.add(f.name.slice(0, -6));
    }
    return ids;
  })();
  return (await seen.ids).has(id);
}

/** A save read back, or null when there is none, it does not parse, or it is not a save. */
export function parseSave(text) {
  try {
    const save = JSON.parse(text ?? "null");
    return save && Array.isArray(save.current) && Array.isArray(save.restore) ? save : null;
  } catch {
    return null;
  }
}

async function hcJson(io, args) {
  const r = await io.hc(args);
  if (r.code !== 0) throw new Error(("hc " + args.join(" ") + ": " + (r.stderr || r.stdout)).trim());
  return JSON.parse(r.stdout);
}

/** A Claude pid file's text read: { sessionId, cwd }, each null when missing. */
const pidInfo = (text) => {
  let info = null;
  try { info = JSON.parse(text ?? "null"); } catch {}
  return { sessionId: info?.sessionId || null, cwd: info?.cwd || null };
};

/** The sessionId in a Claude pid file's text, or null. */
export const sessionIn = (text) => pidInfo(text).sessionId;

/** One terminal as the save records it; space and tab names come from prior when Herdr does not list the space. */
export function observe(t, sessionId, spaces, prior) {
  const labels = {};
  for (const k of ["herdr.space", "herdr.tab"]) if (t.labels?.[k]) labels[k] = t.labels[k];
  const space = (spaces ?? []).find((s) => s.id === labels["herdr.space"]);
  const tab = space?.tabs?.find((x) => x.id === labels["herdr.tab"]);
  return {
    sessionId,
    address: t.address,
    name: t.name ?? null,
    parent: t.parent ?? null,
    cwd: t.foreground?.cwd || t.cwd || null,
    labels,
    spaceName: space?.name ?? prior?.spaceName ?? null,
    spaceNamed: space ? Boolean(space.named) : Boolean(prior?.spaceNamed),
    spaceFolder: space?.folder ?? prior?.spaceFolder ?? null,
    tabName: tab?.name ?? prior?.tabName ?? null,
    tabNamed: tab ? Boolean(tab.named) : Boolean(prior?.tabNamed),
    title: t.title ?? null,
    status: typeof t.status === "string" ? t.status : t.status?.state ?? null,
    flags: keptFlags(t.foreground?.argv),
    pid: t.foreground.pid,
  };
}

/** Where a copy of a save file that could not be read goes: beside it, named by its content. */
export const brokenCopyPath = (appHome, tag, n = 1) => trimEnd(appHome) + "/data/session-restore.broken-" + tag + (n > 1 ? "-" + n : "") + ".json";

const tagOf = (bytes) => {
  let h = 0x811c9dc5;
  for (const b of bytes) h = Math.imul(h ^ b, 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
};
const sameBytes = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

async function copyAside(io, path) {
  const bytes = await io.readBytes(path), tag = tagOf(bytes);
  for (let n = 1; ; n++) {
    const copy = brokenCopyPath(io.appHome, tag, n);
    if (!(await io.exists(copy))) { await io.writeBytes(copy, bytes); return copy; }
    if (sameBytes(await io.readBytes(copy), bytes)) return copy;
  }
}

async function readParsed(io, path, parse) {
  const text = await io.read(path), value = parse(text);
  const broken = text === null ? await io.exists(path).catch(() => false) : value === null;
  return { text, value, broken };
}

// Reads, changes and writes a file, again once when the write finds the file changed. A change
// that returns what it was given writes nothing.
async function updateFile(io, path, parse, change, onBroken, found = {}) {
  for (let attempt = 0; ; attempt++) {
    const readTurn = turnOf(io);
    const read = await readParsed(io, path, parse);
    const before = read.text;
    let prev = read.value;
    if (read.broken) {
      const kept = await onBroken(io, path);
      if (kept.refuse) return { value: kept.value, turn: readTurn, copied: found.copied ?? null };
      found.copied = kept.copied;
      prev = null;
    }
    const next = await change(prev);
    const copied = found.copied ?? null;
    if (next === prev) return { value: next, turn: readTurn, copied };
    try {
      await io.write(path, JSON.stringify(next, null, 2) + "\n", before);
      return { value: next, turn: turnOf(io), copied };
    } catch (err) {
      if (attempt > 0) throw err;
    }
  }
}

const turnOf = (io) => io.turn?.() ?? null;

const brokenHistory = () => ({ version: 1, saves: [], broken: true });

const update = (io, change, found) => updateFile(io, savePath(io.appHome), parseSave, change, async (io, path) => ({ copied: await copyAside(io, path) }), found);
const updateHistory = (io, change) => updateFile(io, historyPath(io.appHome), parseHistory, change, async () => ({ refuse: true, value: brokenHistory() }));
const updateSettings = (io, change) => updateFile(io, settingsPath(io.appHome), parseSettings, change, async () => ({}));

/** The settings on disk, the defaults where the file has none. */
export async function readSettings(io) {
  return parseSettings(await io.read(settingsPath(io.appHome)));
}

/** The save history on disk; with broken true, and no saves, when the file is there but cannot be read. */
export async function readHistory(io) {
  const { value, broken } = await readParsed(io, historyPath(io.appHome), parseHistory);
  return broken ? brokenHistory() : value;
}

/**
 * Writes the fields change(settings) gives onto the settings file as it is read then (the defaults
 * where it has none), again once when the write finds the file changed, and trims the history to the
 * limit written. Returns { settings, history, settingsTurn, historyTurn }: settings the object
 * written; each turn the io.turn() taken once that file was written, or before the history was read
 * when the trim wrote nothing. A history file that cannot be read is not trimmed, and history is
 * readHistory's broken one.
 */
export async function writeSettings(io, change) {
  const { value: settings, turn: settingsTurn } = await updateSettings(io, (prev) => {
    const read = { ...DEFAULT_SETTINGS, ...prev };
    return { ...read, ...change(read) };
  });
  const { value: history, turn: historyTurn } = await updateHistory(io, (h) => trimHistory(h, settings.historyLimit));
  return { settings, history, settingsTurn, historyTurn };
}

/**
 * Deletes saves from the history by id. Returns { history, turn }, turn as writeSettings' are. A
 * history file that cannot be read is left as it is, and history is readHistory's broken one.
 */
export async function deleteSaves(io, ids) {
  const { value: history, turn } = await updateHistory(io, (h) => withoutSnapshots(h, ids));
  return { history, turn };
}

/**
 * Adds a save of the kept sessions from several saves to the history (mergeSnapshots). Returns
 * { history, made, gone }: made the new save, or null when nothing was made; gone the ids of the
 * saves no longer in the history, when any is, nothing being made then. A history file that cannot
 * be read is left as it is: nothing is made, gone is empty, and history is readHistory's broken one.
 */
export async function mergeSaves(io, ids, keep) {
  let made = null, gone = [];
  const { value: history } = await updateHistory(io, (h) => {
    gone = goneSaves(h, ids);
    const next = mergeSnapshots(h, ids, keep, { now: io.now() });
    made = next === h ? null : next.saves[0];
    return next;
  });
  return { history, made, gone };
}

/** Each live Claude terminal in an hc ls list, with its pid file's text: [{ t, text }], text null when it has none. */
async function claudeTerminals(io, terminals) {
  const out = [];
  for (const listed of terminals) {
    if (listed.state !== "live" || !/claude/i.test(listed.agent ?? "")) continue;
    let t;
    try { t = await hcJson(io, ["get", listed.address, "--json"]); } catch { continue; }
    if (!isClaude(t.foreground) || t.foreground?.pid == null) continue;
    out.push({ t, text: await io.read(pidFile(io.home, t.foreground.pid)) });
  }
  return out;
}

/** A look at the terminals: when it started (at, io.now() before the first hc call) and runningSessions' answer. */
export async function lookAtTerminals(io) {
  const at = io.now();
  return { at, running: await runningSessions(io) };
}

/** The sessions live terminals hold now: session id to the address of the first terminal whose Claude pid file holds it. */
export async function runningSessions(io) {
  const { terminals = [] } = await hcJson(io, ["ls", "--json"]);
  const running = new Map();
  for (const { t, text } of await claudeTerminals(io, terminals)) {
    const id = sessionIn(text);
    if (id && !running.has(id)) running.set(id, t.address);
  }
  return running;
}

/**
 * Looks at every live terminal and writes the save: the Claude sessions alive now, and the restore
 * list (nextSave); a session with no transcript is left out. A save file that cannot be read is
 * copied aside first (copied, its path; null when none was). The sessions alive now go into the
 * history when they are not the newest save's (withSnapshot), unless the history file cannot be
 * read: then it is left as it is, and history is broken. found.copied is set as soon as a copy is
 * made, so a caller learns of it when the save then throws. Returns it with the number of Claude
 * pid files that had no session id (unreadable) and of sessions whose transcript could not be looked
 * for (unchecked), and turns: { save, history }, each as writeSettings' turns are.
 */
export async function saveOnce(io, settings = null, found = {}) {
  const { historyLimit } = settings ?? (await readSettings(io));
  let unreadable = 0, unchecked = 0;
  const { value: save, turn: saveTurn, copied } = await update(io, async (prev) => {
    unreadable = 0;
    unchecked = 0;
    const seen = {};
    const now = io.now();
    const core = coreIdentity(await hcJson(io, ["server", "status", "--json"]), now);
    const { terminals = [] } = await hcJson(io, ["ls", "--json"]);
    const prior = new Map([...(prev?.current ?? []), ...(prev?.restore ?? [])].map((e) => [e.sessionId, e]));
    const observed = [];
    for (const { t, text } of await claudeTerminals(io, terminals)) {
      // No pid file: skipped, and not counted as unreadable.
      if (text === null) continue;
      const { sessionId: id, cwd } = pidInfo(text);
      if (!id) { unreadable++; continue; }
      // A session with no conversation yet: skipped. One whose transcript cannot be looked for:
      // kept, and counted as unchecked.
      let talked;
      try { talked = await hasTranscript(io, cwd, id, seen); } catch { talked = null; }
      if (talked === false) continue;
      if (talked === null) unchecked++;
      observed.push(observe(t, id, io.spaces(), prior.get(id)));
    }
    return nextSave(prev, observed, { core, now });
  }, found);
  const { value: history, turn: historyTurn } = await updateHistory(io, (h) => withSnapshot(h, save.current, { now: save.savedAt, limit: historyLimit }));
  return { save, history, unreadable, unchecked, copied, turns: { save: saveTurn, history: historyTurn } };
}

/**
 * Takes entries out of the restore list by key: the panel's remove. Returns { save, turn, copied },
 * turn as writeSettings' are, copied as saveOnce's.
 */
export async function removeEntries(io, keys) {
  const drop = new Set(keys);
  const { value: save, turn, copied } = await update(io, (prev) => ({ ...(prev ?? { version: 1, current: [] }), restore: (prev?.restore ?? []).filter((e) => !drop.has(e.key)) }));
  return { save, turn, copied };
}

/** Records the core holder the Sessions panel last opened itself on. */
export async function markShown(io, core) {
  return (await update(io, (prev) => ({ ...(prev ?? { version: 1, current: [], restore: [] }), shownCore: core }))).value;
}

/**
 * Saves once and summarizes: summarize()'s fields with unreadable, unchecked, historyBroken (the
 * history file cannot be read, which stalls the save), saveCopied (where saveOnce copied a save
 * file that could not be read, or null) and the error, with the save, the history and their turns
 * (saveOnce's). A save that throws leaves the files as they were, and the summary is of that save,
 * read back, each turn taken before its read.
 */
export async function saveAndSummarize(io, settings = null) {
  let save = null, history = null, unreadable = 0, unchecked = 0, error = null, turns = null;
  const found = {};
  settings ??= await readSettings(io);
  try {
    ({ save, history, unreadable, unchecked, turns } = await saveOnce(io, settings, found));
  } catch (err) {
    error = String(err?.message ?? err);
    turns = { save: turnOf(io) };
    save = parseSave(await io.read(savePath(io.appHome)));
    turns.history = turnOf(io);
    history = await readHistory(io);
  }
  const historyBroken = Boolean(history?.broken);
  const failed = Boolean(error) || unreadable > 0 || unchecked > 0 || historyBroken;
  return { save, history, turns, summary: { ...summarize(save, { now: io.now(), failed, staleMs: staleAfter(settings.saveEveryMinutes) }), unreadable, unchecked, historyBroken, saveCopied: found.copied ?? null, error } };
}

/** How often the chip looks whether a save is due. */
export const CHECK_EVERY_MS = 60_000;

/**
 * The chip's save: once now, then whenever the settings' interval has passed since the last one
 * (looked at every CHECK_EVERY_MS, the settings read each time), and at once on the "save" command;
 * one at a time. With the settings' autoSave false, only the "save" command saves. Each summary goes to share(summary, save, history), with the save it is of and the history. The first
 * successful save on a core holder the panel has not unfolded itself on marks that holder shown,
 * and unfolds the panel when something can be restored. settings() is the settings last read.
 * every(ms, fn) and spawn(cx, job) are the host's timer and task; cx is passed through untouched,
 * and job and unfold get the task's context. saving(on, cx) is told when a save starts (true) and
 * ends (false), and not for a check with no save due. share gets the save's turns fourth (saveOnce).
 */
export function startSaving(io, { every, spawn, share, unfold, saving: told = () => {} }, cx) {
  let saving = false, first = true, lastAt = null, settings = parseSettings(null);
  const run = (cx, mode) => {
    if (saving) return false;
    saving = true;
    spawn(cx, async (taskCx) => {
      try {
        settings = await readSettings(io);
        if (mode !== "now" && !settings.autoSave) return;
        if (mode === "timer" && lastAt !== null && io.now() - lastAt < settings.saveEveryMinutes * 60_000) return;
        lastAt = io.now();
        told(true, taskCx);
        const { save, history, turns, summary } = await saveAndSummarize(io, settings).finally(() => told(false, taskCx));
        share(summary, save, history, turns);
        if (first && !summary.error && save?.core) {
          first = false;
          if (save.shownCore !== save.core) {
            await markShown(io, save.core);
            if (summary.restorable > 0) unfold(taskCx);
          }
        }
      } finally {
        saving = false;
      }
    });
    return true;
  };
  const tick = (cx) => run(cx, "now");
  run(cx, "start");
  every(CHECK_EVERY_MS, (cx) => run(cx, "timer"));
  return { tick, command: (name, cx) => name === "save" && tick(cx), settings: () => settings };
}
