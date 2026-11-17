// The save: the Claude session each live terminal holds, and the restore list, in the app's
// data folder, and the chip's cadence for it. Side effects go through io ({ hc, read, write,
// exists, list, spaces, now, home, appHome }).
import { coreIdentity, isClaude, keptFlags, nextSave, summarize } from "./logic.js";

const trimEnd = (path) => String(path).replace(/[\\/]+$/, "");

/** Where the whole save lives. */
export const savePath = (appHome) => trimEnd(appHome) + "/data/session-restore.json";
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

/** A save read back, or null when there is none or it does not parse. */
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

// Reads, changes and writes the save, again once when the write finds the file changed.
async function update(io, change) {
  const path = savePath(io.appHome);
  for (let attempt = 0; ; attempt++) {
    const before = await io.read(path);
    const next = await change(parseSave(before));
    try {
      await io.write(path, JSON.stringify(next, null, 2) + "\n", before);
      return next;
    } catch (err) {
      if (attempt > 0) throw err;
    }
  }
}

/**
 * Looks at every live terminal and writes the save: the Claude sessions alive now, and the restore
 * list (nextSave); a session with no transcript is left out. Returns it with the number of Claude
 * pid files that had no session id (unreadable) and of sessions whose transcript could not be looked
 * for (unchecked).
 */
export async function saveOnce(io) {
  let unreadable = 0, unchecked = 0;
  const save = await update(io, async (prev) => {
    unreadable = 0;
    unchecked = 0;
    const seen = {};
    const now = io.now();
    const core = coreIdentity(await hcJson(io, ["server", "status", "--json"]), now);
    const { terminals = [] } = await hcJson(io, ["ls", "--json"]);
    const prior = new Map([...(prev?.current ?? []), ...(prev?.restore ?? [])].map((e) => [e.sessionId, e]));
    const observed = [];
    for (const listed of terminals) {
      if (listed.state !== "live" || !/claude/i.test(listed.agent ?? "")) continue;
      let t;
      try { t = await hcJson(io, ["get", listed.address, "--json"]); } catch { continue; }
      if (!isClaude(t.foreground) || t.foreground?.pid == null) continue;
      const text = await io.read(pidFile(io.home, t.foreground.pid));
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
  });
  return { save, unreadable, unchecked };
}

/** Takes entries out of the restore list by key: the panel's remove. */
export function removeEntries(io, keys) {
  const drop = new Set(keys);
  return update(io, (prev) => ({ ...(prev ?? { version: 1, current: [] }), restore: (prev?.restore ?? []).filter((e) => !drop.has(e.key)) }));
}

/** Records the core holder the Sessions panel last opened itself on. */
export function markShown(io, core) {
  return update(io, (prev) => ({ ...(prev ?? { version: 1, current: [], restore: [] }), shownCore: core }));
}

/**
 * Saves once and summarizes: summarize()'s fields with unreadable, unchecked and the error. A save
 * that throws leaves the file as it was, and the summary is of that file.
 */
export async function saveAndSummarize(io) {
  let save = null, unreadable = 0, unchecked = 0, error = null;
  try {
    ({ save, unreadable, unchecked } = await saveOnce(io));
  } catch (err) {
    error = String(err?.message ?? err);
    save = parseSave(await io.read(savePath(io.appHome)));
  }
  const failed = Boolean(error) || unreadable > 0 || unchecked > 0;
  return { save, summary: { ...summarize(save, { now: io.now(), failed }), unreadable, unchecked, error } };
}

/** How often the chip saves. */
export const SAVE_EVERY_MS = 60_000;

/**
 * The chip's save: once now, every SAVE_EVERY_MS, and on the "save" command; one at a time. Each
 * summary goes to share(summary, save), with the save it is of. The first successful save on a
 * core holder the panel has not unfolded itself on marks that holder shown, and unfolds the panel
 * when something can be restored.
 * every(ms, fn) and spawn(cx, job) are the host's timer and task; cx is passed through untouched.
 */
export function startSaving(io, { every, spawn, share, unfold }, cx) {
  let saving = false, first = true;
  const tick = (cx) => {
    if (saving) return false;
    saving = true;
    spawn(cx, async () => {
      try {
        const { save, summary } = await saveAndSummarize(io);
        share(summary, save);
        if (first && !summary.error && save?.core) {
          first = false;
          if (save.shownCore !== save.core) {
            await markShown(io, save.core);
            if (summary.restorable > 0) unfold();
          }
        }
      } finally {
        saving = false;
      }
    });
    return true;
  };
  tick(cx);
  every(SAVE_EVERY_MS, tick);
  return { tick, command: (name, cx) => name === "save" && tick(cx) };
}
