// Opening saved sessions again: into the shell a kept terminal came back as, or into a new
// terminal in the saved space and tab. io: { hc, run, spaces, sleep, read, home }.
import { isClaude, isShell, placement, planOpen, resumeArgv, shellLine } from "./logic.js";
import { pidFile, sessionIn } from "./save.js";

// The last line the terminal printed that is not a shell prompt ("PS D:\repo>", "user@host:~$").
async function lastLine(io, address) {
  try {
    const r = await io.hc(["read", address, "--lines", "5"]);
    return r.stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/[>$#%]$/.test(l)).pop() ?? null;
  } catch {
    return null;
  }
}

/** Waits until the terminal's Claude has held the session id for 2 s; null when it has, else why not. */
export async function confirm(io, address, sessionId, tries = 40) {
  let sawClaude = false, held = 0;
  for (let i = 0; i < tries; i++) {
    await io.sleep(500);
    const t = await get(io, address);
    if (t && t.state !== "live") return (await lastLine(io, address)) ?? "its terminal ended";
    if (t && isClaude(t.foreground)) {
      sawClaude = true;
      held = sessionIn(await io.read(pidFile(io.home, t.foreground.pid))) === sessionId ? held + 1 : 0;
      if (held >= 4) return null;
    } else if (t && sawClaude && isShell(t.foreground)) {
      return (await lastLine(io, address)) ?? "Claude ended at once";
    }
  }
  return "the session did not show within " + Math.round(tries / 2) + " s";
}

async function get(io, address) {
  try {
    const r = await io.hc(["get", address, "--json"]);
    return r.code === 0 ? JSON.parse(r.stdout) : null;
  } catch {
    return null;
  }
}

// The terminal at the saved address carries the saved space label.
const same = (t, e) => !e.labels?.["herdr.space"] || t.labels?.["herdr.space"] === e.labels["herdr.space"];

async function start(io, e, parentAddress) {
  const { labels, renames } = placement(e, io.spaces());
  const args = ["run", "--bg", "--json", "--keep"];
  args.push(...(parentAddress ? ["--parent", parentAddress] : ["--no-parent"]));
  if (e.cwd) args.push("--cwd", e.cwd);
  for (const [k, v] of Object.entries(labels)) args.push("--label", k + "=" + v);
  const argv = ["--", ...resumeArgv(e)];
  let r = await io.hc(e.name ? [...args, "--name", e.name, ...argv] : [...args, ...argv]);
  // Without the name when hc run refuses it.
  if (r.code !== 0 && e.name) r = await io.hc([...args, ...argv]);
  if (r.code !== 0) throw new Error((r.stderr || r.stdout || "hc run failed").trim());
  const address = JSON.parse(r.stdout).address;
  if (renames.length) {
    // Renames wait, up to 5 s, until Herdr lists the new space or tab.
    const id = (rn) => rn.args.id;
    for (let i = 0; i < 20 && !renames.every((rn) => io.spaces().some((s) => s.id === id(rn) || s.tabs?.some((t) => t.id === id(rn)))); i++) await io.sleep(250);
    for (const rn of renames) io.run(rn.command, rn.args);
  }
  return address;
}

async function openOne(io, e, parentAddress) {
  const t = await get(io, e.address);
  if (t?.state === "live" && same(t, e)) {
    if (isShell(t.foreground)) {
      const r = await io.hc(["send", e.address, shellLine(resumeArgv(e), t.foreground.name)]);
      if (r.code !== 0) throw new Error((r.stderr || r.stdout || "hc send failed").trim());
      return e.address;
    }
    if (isClaude(t.foreground)) throw new Error("its terminal runs another Claude session");
    throw new Error("its terminal is running " + (t.foreground?.name ?? "another program"));
  }
  return start(io, e, parentAddress);
}

/**
 * Opens the selected entries, conductors first, then waits for each to show its session. Calls
 * onStep with each result as it lands and returns them all: { key, ok, address?, reason? }.
 * Nothing is sent after the resume.
 */
export async function openSessions(io, selected, all, onStep = () => {}) {
  const addressOf = new Map(), results = [], started = [];
  const settle = (result) => { results.push(result); onStep(result); return result; };
  for (const step of planOpen(selected, all)) {
    const e = step.entry;
    if (step.skip) { addressOf.set(e.sessionId, e.address); continue; }
    if (step.blocked) { settle({ key: e.key, ok: false, reason: "its conductor is not in the restore list" }); continue; }
    const parent = step.conductor ? addressOf.get(step.conductor) : null;
    if (step.conductor && !parent) { settle({ key: e.key, ok: false, reason: "its conductor did not open" }); continue; }
    try {
      const address = await openOne(io, e, parent);
      addressOf.set(e.sessionId, address);
      started.push({ e, address });
    } catch (err) {
      settle({ key: e.key, ok: false, reason: String(err?.message ?? err) });
    }
  }
  // Started in plan order, then confirmed together.
  await Promise.all(started.map(async ({ e, address }) => {
    const why = await confirm(io, address, e.sessionId);
    settle(why ? { key: e.key, ok: false, address, reason: why } : { key: e.key, ok: true, address });
  }));
  return results;
}
