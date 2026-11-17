// The save: the Claude session each live terminal holds, and the restore list, in the app's
// data folder. Side effects go through io ({ hc, read, write, spaces, now, home, appHome }).
import { coreIdentity, isClaude, keptFlags, nextSave } from "./logic.js";

/** Where the whole save lives. */
export const savePath = (appHome) => String(appHome).replace(/[\\/]+$/, "") + "/data/session-restore.json";
/** Claude Code's file for a running process: { sessionId, cwd, name, status, ... }. */
export const pidFile = (home, pid) => String(home).replace(/[\\/]+$/, "") + "/.claude/sessions/" + pid + ".json";

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

/** The sessionId in a Claude pid file's text, or null. */
export const sessionIn = (text) => {
  try { return JSON.parse(text ?? "null")?.sessionId || null; } catch { return null; }
};

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
 * list (nextSave). Returns it with the number of Claude pid files that had no session id.
 */
export async function saveOnce(io) {
  let unreadable = 0;
  const save = await update(io, async (prev) => {
    unreadable = 0;
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
      const id = sessionIn(text);
      if (!id) { unreadable++; continue; }
      observed.push(observe(t, id, io.spaces(), prior.get(id)));
    }
    return nextSave(prev, observed, { core, now });
  });
  return { save, unreadable };
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
