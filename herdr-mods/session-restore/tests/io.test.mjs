// save.js and open.js against a fake hc and file system: run with node --test 'herdr-mods/session-restore/tests/*.test.mjs'
import { test } from "node:test";
import assert from "node:assert/strict";
import { runningSessions, saveOnce, savePath, removeEntries, saveAndSummarize, parseSave } from "../save.js";
import { openSessions, openLogPath, OPEN_LOG_LINES } from "../open.js";
import { settleOpen, withMarks } from "../logic.js";

const HOME = "C:/Users/U", APP = "C:/Users/U/.config/herdr-app";
const SPACES = [{ id: "sp1", name: "skills", named: false, folder: "", tabs: [{ id: "tb1", name: "1", named: false }] }];

// A fake machine: terminals as hc get answers them, files by path, and every hc call recorded.
function machine({ terminals = [], files = {}, now = 1_000_000, gone = new Set(), nullRead = new Set() } = {}) {
  let nextPid = 500;
  // A resume shows its session. One of a session in `gone` does too, as Claude does, and then
  // prints why it cannot and ends two looks later.
  const resume = (t, argv) => {
    const id = argv[argv.indexOf("--resume") + 1];
    const pid = nextPid++;
    t.foreground = { name: "claude.exe", pid, argv };
    files[HOME + "/.claude/sessions/" + pid + ".json"] = JSON.stringify({ sessionId: id });
    if (gone.has(id)) { t.endsIn = 2; t.goneId = id; }
  };
  const look = (t) => {
    if (t?.endsIn !== undefined && --t.endsIn < 0) {
      delete files[HOME + "/.claude/sessions/" + t.foreground.pid + ".json"];
      t.state = "finished"; t.foreground = null; t.screen = "No conversation found with session ID: " + t.goneId + "\nPS D:\\repo>";
      delete t.endsIn;
    }
    return t;
  };
  const calls = [], ran = [], lists = [];
  const ok = (v) => ({ code: 0, stdout: JSON.stringify(v), stderr: "" });
  const io = {
    home: HOME, appHome: APP, now: () => now, spaces: () => SPACES, sleep: async () => {},
    read: async (p) => (p in files && !nullRead.has(p) ? files[p] : null),
    readBytes: async (p) => { if (!(p in files)) throw new Error("ENOENT " + p); return new TextEncoder().encode(files[p]); },
    writeBytes: async (p, bytes) => { files[p] = new TextDecoder().decode(bytes); },
    exists: async (p) => p in files,
    list: async (dir) => {
      lists.push(dir);
      const under = Object.keys(files).filter((p) => p.startsWith(dir + "/")).map((p) => p.slice(dir.length + 1).split("/"));
      return [...new Map(under.map((parts) => [parts[0], parts.length > 1])).entries()].map(([name, isDir]) => ({ name, isDirectory: () => isDir }));
    },
    write: async (p, text, expected) => {
      if ((files[p] ?? null) !== expected) throw new Error("stale");
      files[p] = text;
    },
    run: (command, args) => { ran.push([command, args]); },
    hc: async (args) => {
      calls.push(args);
      if (args[0] === "ls") return ok({ terminals: terminals.map((t) => ({ address: t.address, state: t.state, agent: /claude/i.test(t.foreground?.name ?? "") ? "claude-code" : t.foreground?.name })) });
      if (args[0] === "get") {
        const t = look(terminals.find((x) => x.address === args[1]));
        return t ? ok(t) : { code: 1, stdout: "", stderr: "no such terminal" };
      }
      if (args[0] === "send") { resume(terminals.find((x) => x.address === args[1]), args[2].split(" ")); return ok({ sent: true }); }
      if (args[0] === "run") {
        const address = "t" + (90 + calls.filter((c) => c[0] === "run").length);
        const labels = Object.fromEntries(args.flatMap((a, i) => (a === "--label" ? [args[i + 1].split("=")] : [])));
        const t = { address, state: "live", labels };
        terminals.push(t);
        resume(t, args.slice(args.indexOf("--") + 1));
        return ok({ address });
      }
      if (args[0] === "read") return { code: 0, stdout: (terminals.find((x) => x.address === args[1])?.screen ?? "") + "\n", stderr: "" };
      return { code: 2, stdout: "", stderr: "unexpected" };
    },
  };
  return { io, calls, ran, files, lists };
}

const claudeTerm = (address, pid, extra = {}) => ({
  address, state: "live", title: "work", status: { state: "working" }, cwd: "D:/repo", labels: { "herdr.space": "sp1", "herdr.tab": "tb1", where: "skills / 1" },
  foreground: { name: "claude.EXE", pid, cwd: "D:/repo", argv: ["claude", "--model", "opus", "Read brief.md and do what it says."] }, ...extra,
});
const pidPath = (pid) => HOME + "/.claude/sessions/" + pid + ".json";
const pidText = (sessionId, cwd = "D:\\repo") => JSON.stringify({ sessionId, cwd });
const transcript = (dir, id) => HOME + "/.claude/projects/" + dir + "/" + id + ".jsonl";

test("saveOnce records each live Claude with its session id, flags and place", async () => {
  const m = machine({ terminals: [claudeTerm("t4", 100)], files: { [pidPath(100)]: pidText("s1"), [transcript("D--repo", "s1")]: "{}\n" } });
  const { save } = await saveOnce(m.io);
  assert.deepEqual(Object.keys(save).sort(), ["savedAt", "sessions", "version"]);
  assert.deepEqual(save.sessions.map((e) => [e.sessionId, e.address, e.pid, e.spaceName, e.tabName, e.status]),
    [["s1", "t4", 100, "skills", "1", "working"]]);
  assert.deepEqual(save.sessions[0].flags, ["--model", "opus"]);
  assert.deepEqual(save.sessions[0].labels, { "herdr.space": "sp1", "herdr.tab": "tb1" });
  assert.deepEqual(JSON.parse(m.files[savePath(APP)]), save);
});

test("saveOnce writes over the file with the sessions alive now, keeping nothing the file held", async () => {
  const prev = { version: 2, savedAt: 1, sessions: [{ key: "s1", sessionId: "s1", address: "t4", labels: {}, flags: [] }] };
  const m = machine({ terminals: [claudeTerm("t5", 100)], files: { [savePath(APP)]: JSON.stringify(prev), [pidPath(100)]: pidText("s2"), [transcript("D--repo", "s2")]: "{}\n" } });
  const { save } = await saveOnce(m.io);
  assert.deepEqual(save.sessions.map((e) => e.sessionId), ["s2"]);
  assert.deepEqual(JSON.parse(m.files[savePath(APP)]), save);
});

test("saveOnce over a file an earlier version wrote keeps none of its lists", async () => {
  const old = { version: 1, core: "h0", savedAt: 1, shownCore: "h0", current: [{ key: "s1", sessionId: "s1" }], restore: [{ key: "s0", sessionId: "s0" }] };
  const m = machine({ files: { [savePath(APP)]: JSON.stringify(old) } });
  const { save, copied } = await saveOnce(m.io);
  assert.deepEqual(JSON.parse(m.files[savePath(APP)]), { version: 2, savedAt: 1_000_000, sessions: [] });
  assert.equal(copied, null);
  assert.equal(save.sessions.length, 0);
});

test("parseSave reads a file an earlier version wrote as the sessions alive at its save", () => {
  const old = { version: 1, core: "h0", savedAt: 7, current: [{ key: "s1", sessionId: "s1" }], restore: [{ key: "s0", sessionId: "s0" }] };
  assert.deepEqual(parseSave(JSON.stringify(old)), { version: 2, savedAt: 7, sessions: [{ key: "s1", sessionId: "s1" }] });
  assert.equal(parseSave('{"sessions":{}}'), null);
});

test("saveOnce leaves out a Claude whose session has no transcript yet, and counts it as nothing", async () => {
  const m = machine({
    terminals: [claudeTerm("t4", 100), claudeTerm("t5", 101)],
    files: { [pidPath(100)]: pidText("s1"), [transcript("D--repo", "s1")]: "{}\n", [pidPath(101)]: pidText("fresh"), [transcript("D--repo", "other")]: "{}\n" },
  });
  const { save, unreadable, unchecked } = await saveOnce(m.io);
  assert.deepEqual(save.sessions.map((e) => e.sessionId), ["s1"]);
  assert.deepEqual([unreadable, unchecked], [0, 0]);
  assert.deepEqual(JSON.parse(m.files[savePath(APP)]).sessions.map((e) => e.sessionId), ["s1"]);
});

test("saveOnce keeps a session whose transcript is under any project folder, and lists the folders once a save", async () => {
  const m = machine({
    terminals: [claudeTerm("t4", 100), claudeTerm("t5", 101), claudeTerm("t6", 102)],
    files: {
      // Under the folder Claude names from the cwd ("_" as "-"), under another one, and under none.
      [pidPath(100)]: pidText("s1", "C:\\Users\\U\\my_app"), [transcript("C--Users-U-my-app", "s1")]: "{}\n",
      [pidPath(101)]: pidText("moved"), [transcript("D--elsewhere-" + "a".repeat(210) + "-1x2y3z", "moved")]: "{}\n",
      [pidPath(102)]: pidText("fresh"),
    },
  });
  const { save } = await saveOnce(m.io);
  assert.deepEqual(save.sessions.map((e) => e.sessionId), ["s1", "moved"]);
  const root = HOME + "/.claude/projects";
  assert.equal(m.lists.filter((d) => d === root).length, 1);
});

test("saveOnce keeps a session it cannot check, as before, and counts it as unchecked", async () => {
  const m = machine({ terminals: [claudeTerm("t4", 100), claudeTerm("t5", 101)], files: { [pidPath(100)]: pidText("s1"), [pidPath(101)]: pidText("s2") } });
  m.io.exists = async () => { throw new Error("outside every granted read root"); };
  const { save, unreadable, unchecked } = await saveOnce(m.io);
  assert.deepEqual(save.sessions.map((e) => e.sessionId), ["s1", "s2"]);
  assert.deepEqual([unreadable, unchecked], [0, 2]);
});

test("saveOnce lists no folder when every session's transcript is where its cwd names", async () => {
  const m = machine({ terminals: [claudeTerm("t4", 100)], files: { [pidPath(100)]: pidText("s1"), [transcript("D--repo", "s1")]: "{}\n" } });
  await saveOnce(m.io);
  assert.deepEqual(m.lists, []);
});

test("saveOnce counts a pid file without a session id as unreadable and saves nothing for it", async () => {
  const m = machine({ terminals: [claudeTerm("t4", 100)], files: { [pidPath(100)]: "{\"id\":\"renamed\"}" } });
  const { save, unreadable } = await saveOnce(m.io);
  assert.equal(unreadable, 1);
  assert.deepEqual(save.sessions, []);
});

test("removeEntries takes the named entries out of the save and nothing else", async () => {
  const prev = { version: 2, savedAt: 3, sessions: [{ key: "a", sessionId: "a" }, { key: "b", sessionId: "b" }, { key: "c", sessionId: "c" }] };
  const m = machine({ files: { [savePath(APP)]: JSON.stringify(prev) } });
  await removeEntries(m.io, ["a"]);
  assert.deepEqual(JSON.parse(m.files[savePath(APP)]), { version: 2, savedAt: 3, sessions: [{ key: "b", sessionId: "b" }, { key: "c", sessionId: "c" }] });
});

function counted(m) {
  let n = 0;
  const at = [];
  m.io.turn = () => ++n;
  const { read, write } = m.io;
  m.io.read = async (p) => { at.push(["read", p, n]); return read(p); };
  m.io.write = async (p, t, e) => { at.push(["write", p, n]); return write(p, t, e); };
  return at;
}
const lastAt = (at, kind, path) => at.filter((a) => a[0] === kind && a[1] === path).at(-1)[2];
const firstAt = (at, kind, path) => at.find((a) => a[0] === kind && a[1] === path)[2];

test("a save gives the number taken as its save file was written, and summarizes what it wrote", async () => {
  const m = machine({ terminals: [claudeTerm("t4", 100)], files: { [pidPath(100)]: pidText("s1"), [transcript("D--repo", "s1")]: "{}\n" } });
  const at = counted(m);
  const { turn, summary } = await saveAndSummarize(m.io);
  assert.equal(turn, lastAt(at, "write", savePath(APP)) + 1);
  assert.deepEqual(summary, { saved: 1, savedAt: 1_000_000, failed: false, unreadable: 0, unchecked: 0, saveCopied: null, error: null });
});

test("a failed save leaves the file as it was, says it failed, and gives the number taken before it read the file back", async () => {
  const prev = JSON.stringify({ version: 2, savedAt: 1, sessions: [{ key: "s1", sessionId: "s1" }] });
  const m = machine({ files: { [savePath(APP)]: prev } });
  const at = counted(m);
  m.io.hc = async () => ({ code: 1, stdout: "", stderr: "core not running" });
  const { save, turn, summary } = await saveAndSummarize(m.io);
  assert.match(summary.error, /core not running/);
  assert.deepEqual([summary.failed, summary.saved, summary.savedAt], [true, 1, 1]);
  assert.equal(m.files[savePath(APP)], prev);
  assert.deepEqual(save.sessions.map((e) => e.key), ["s1"]);
  assert.equal(turn, lastAt(at, "read", savePath(APP)));
});

test("removeEntries returns the number taken once its write landed", async () => {
  const prev = { version: 2, savedAt: 1, sessions: [{ key: "a", sessionId: "a" }] };
  const m = machine({ files: { [savePath(APP)]: JSON.stringify(prev) } });
  const at = counted(m);
  const removed = await removeEntries(m.io, ["a"]);
  assert.deepEqual(removed.save.sessions, []);
  assert.deepEqual(removed.turn, lastAt(at, "write", savePath(APP)) + 1);
});

const saved = (over) => ({ key: over.sessionId, live: false, status: "idle", flags: ["--model", "opus"], cwd: "D:/repo",
  labels: { "herdr.space": "sp1", "herdr.tab": "tb1" }, spaceName: "skills", tabName: "1", parent: null, name: null, ...over });
const shellTerm = (address, extra = {}) => ({ address, state: "live", labels: { "herdr.space": "sp1", "herdr.tab": "tb1" }, foreground: { name: "pwsh.exe", pid: 1 }, ...extra });

test("openSessions resumes a conductor in the shell it came back as, and starts its finished worker under it", async () => {
  const c = saved({ sessionId: "c1", address: "t4" });
  const w = saved({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1", name: "tg-1-60", labels: { "herdr.space": "sp1" } });
  const m = machine({ terminals: [shellTerm("t4"), { address: "t5", state: "finished", labels: { "herdr.space": "sp1" } }] });
  const results = await openSessions(m.io, [w], [c, w]);
  assert.deepEqual(results.map((r) => [r.key, r.ok, r.address]), [["c1", true, "t4"], ["w1", true, "t91"]]);
  const sends = m.calls.filter((a) => a[0] === "send"), runs = m.calls.filter((a) => a[0] === "run");
  assert.deepEqual(sends, [["send", "t4", "claude --resume c1 --model opus"]]);
  assert.equal(runs.length, 1);
  const run = runs[0];
  assert.deepEqual(run.slice(run.indexOf("--")), ["--", "claude", "--resume", "w1", "--model", "opus"]);
  assert.equal(run[run.indexOf("--parent") + 1], "t4");
  assert.equal(run[run.indexOf("--name") + 1], "tg-1-60");
  assert.ok(run.includes("herdr.space=sp1"));
});

test("openSessions starts a finished conductor in a new terminal and its worker under the new address", async () => {
  const c = saved({ sessionId: "c1", address: "t4", status: "working" });
  const w = saved({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1" });
  const m = machine({ terminals: [{ address: "t4", state: "finished" }] });
  const results = await openSessions(m.io, [c], [c, w]);
  assert.deepEqual(results.map((r) => [r.key, r.ok, r.address]), [["c1", true, "t91"], ["w1", true, "t92"]]);
  const runs = m.calls.filter((a) => a[0] === "run");
  assert.ok(runs[0].includes("--no-parent"));
  assert.equal(runs[1][runs[1].indexOf("--parent") + 1], "t91");
  assert.equal(m.calls.filter((a) => a[0] === "send").length, 0);
});

test("openSessions sends nothing to a terminal busy with another program, and keeps its worker shut", async () => {
  const c = saved({ sessionId: "c1", address: "t4" });
  const w = saved({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1" });
  const m = machine({ terminals: [shellTerm("t4", { foreground: { name: "nvim", pid: 2 } })] });
  const results = await openSessions(m.io, [c], [c, w]);
  assert.deepEqual(results.map((r) => [r.key, r.ok]), [["c1", false], ["w1", false]]);
  assert.match(results[0].reason, /nvim/);
  assert.equal(m.calls.filter((a) => a[0] === "send" || a[0] === "run").length, 0);
});

test("openSessions never opens a worker whose conductor is in neither list", async () => {
  const w = saved({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1" });
  const m = machine({ terminals: [] });
  const results = await openSessions(m.io, [w], [w]);
  assert.deepEqual(results.map((r) => [r.key, r.ok]), [["w1", false]]);
  assert.match(results[0].reason, /conductor/);
  assert.equal(m.calls.filter((a) => a[0] === "run" || a[0] === "send").length, 0);
});

test("openSessions reports a resume that ends at once as failed, with what it printed", async () => {
  const e = saved({ sessionId: "s1", address: "t4" });
  const m = machine({ terminals: [{ address: "t4", state: "finished" }], gone: new Set(["s1"]) });
  const results = await openSessions(m.io, [e], [e]);
  assert.deepEqual(results.map((r) => [r.key, r.ok, r.address]), [["s1", false, "t91"]]);
  assert.match(results[0].reason, /No conversation found/);
});

test("openSessions runs the renames a missing space needs, after Herdr shows the new space", async () => {
  const e = saved({ sessionId: "s1", address: "t4", labels: { "herdr.space": "spX", "herdr.tab": "tbX" }, spaceName: "work", spaceNamed: true });
  const m = machine({ terminals: [] });
  let shown = false;
  m.io.spaces = () => (shown ? [...SPACES, { id: "spX", name: "repo", named: false, tabs: [{ id: "tbX", name: "1", named: false }] }] : SPACES);
  m.io.sleep = async () => { shown = true; };
  const seen = [];
  m.io.run = (command, args) => seen.push([command, args, shown]);
  const results = await openSessions(m.io, [e], [e]);
  assert.equal(results[0].ok, true);
  // The rename went out once the space was there, not before.
  assert.deepEqual(seen, [["space.rename", { id: "spX", name: "work" }, true]]);
});

test("an open over withMarks starts a worker under the conductor this panel opened, and does not open that conductor again", async () => {
  // c1 opened at t81 but the save still lists it closed at t4; w1 failed then.
  const c = saved({ sessionId: "c1", address: "t4" });
  const w = saved({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1" });
  const m = machine({ terminals: [{ address: "t4", state: "finished" }, claudeTerm("t81", 81)], files: { [pidPath(81)]: pidText("c1") } });
  const states = new Map([["c1", { at: "opened", address: "t81" }], ["w1", { at: "failed", reason: "x" }]]);
  const results = await openSessions(m.io, [w], withMarks([c, w], states));
  assert.deepEqual(results.map((r) => [r.key, r.ok]), [["w1", true]]);
  const runs = m.calls.filter((a) => a[0] === "run");
  assert.equal(runs.length, 1);
  assert.equal(runs[0][runs[0].indexOf("--parent") + 1], "t81");
});

test("an open over withMarks does not start a worker another open is still opening", async () => {
  const c = saved({ sessionId: "c1", address: "t4" });
  const w1 = saved({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1" });
  const w2 = saved({ sessionId: "w2", address: "t6", parent: "t4", parentSession: "c1" });
  const m = machine({ terminals: [claudeTerm("t4", 4)], files: { [pidPath(4)]: pidText("c1") } });
  const all = [{ ...c, live: true }, w1, w2];
  const states = new Map([["w1", { at: "failed", reason: "x" }], ["w2", { at: "opening", open: 1 }]]);
  const results = await openSessions(m.io, [w1], withMarks(all, states));
  assert.deepEqual(results.map((r) => [r.key, r.ok]), [["w1", true]]);
  assert.equal(m.calls.filter((a) => a[0] === "run").length, 1);
});

test("a worker under a conductor another open is still opening fails as its conductor did not open", async () => {
  const c = saved({ sessionId: "c1", address: "t4" });
  const w = saved({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1" });
  const m = machine({ terminals: [] });
  const results = await openSessions(m.io, [w], withMarks([c, w], new Map([["c1", { at: "opening", open: 1 }]])));
  assert.deepEqual(results.map((r) => [r.key, r.ok, r.reason]), [["w1", false, "its conductor did not open"]]);
  assert.equal(m.calls.filter((a) => a[0] === "run" || a[0] === "send").length, 0);
});

test("a resume still starting when confirm gives up reads as such, and an open after it does not start a second terminal", async () => {
  // t91's Claude never writes its pid file while it is watched: the seconds before it does.
  const e = saved({ sessionId: "s1", address: "t4" });
  const m = machine({ terminals: [{ address: "t4", state: "finished" }] });
  const read = m.io.read;
  m.io.read = async (p) => (p.includes("/.claude/sessions/") ? null : read(p));
  const first = await openSessions(m.io, [e], [e]);
  assert.deepEqual(first.map((r) => [r.key, r.ok, r.address]), [["s1", false, "t91"]]);
  assert.equal(first[0].reason, "still starting at t91, not confirmed within 20 s");
  const states = settleOpen(new Map([["s1", { at: "opening", open: 1 }]]), 1, first[0], 0);
  const again = await openSessions(m.io, [e], withMarks([e], states));
  assert.deepEqual(again.map((r) => [r.key, r.ok, r.address, r.reason]), [["s1", false, "t91", "its terminal runs a Claude that has not shown its session yet"]]);
  // A third open, after the second failed too, still looks at t91.
  const after = settleOpen(new Map([["s1", { at: "opening", open: 2 }]]), 2, again[0], 0);
  const third = await openSessions(m.io, [e], withMarks([e], after));
  assert.deepEqual(third.map((r) => [r.key, r.ok, r.address]), [["s1", false, "t91"]]);
  assert.equal(m.calls.filter((a) => a[0] === "run" || a[0] === "send").length, 1);
});

test("openSessions does not open a session a live terminal already holds, and reports it opened there", async () => {
  // The save still lists s1 closed at t4, and the panel has no mark for it.
  const e = saved({ sessionId: "s1", address: "t4" });
  const m = machine({ terminals: [{ address: "t4", state: "finished" }, claudeTerm("t7", 7)], files: { [pidPath(7)]: pidText("s1") } });
  const results = await openSessions(m.io, [e], [e]);
  assert.deepEqual(results.map((r) => [r.key, r.ok, r.address, r.reason]), [["s1", true, "t7", "already running at t7"]]);
  assert.equal(m.calls.filter((a) => a[0] === "run" || a[0] === "send").length, 0);
});

test("a worker whose conductor already runs elsewhere starts under that terminal, and the conductor is not opened again", async () => {
  const c = saved({ sessionId: "c1", address: "t4" });
  const w = saved({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1" });
  const m = machine({ terminals: [{ address: "t4", state: "finished" }, claudeTerm("t7", 7)], files: { [pidPath(7)]: pidText("c1") } });
  const results = await openSessions(m.io, [w], [c, w]);
  assert.deepEqual(results.map((r) => [r.key, r.ok, r.address]), [["c1", true, "t7"], ["w1", true, "t91"]]);
  const runs = m.calls.filter((a) => a[0] === "run");
  assert.equal(runs.length, 1);
  assert.equal(runs[0][runs[0].indexOf("--parent") + 1], "t7");
});

test("a worker is not started under a conductor the panel marked opened whose terminal no longer holds it", async () => {
  // After a core restart t81 came back as a shell.
  const c = saved({ sessionId: "c1", address: "t4" });
  const w = saved({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1" });
  const m = machine({ terminals: [shellTerm("t81")] });
  const results = await openSessions(m.io, [w], withMarks([c, w], new Map([["c1", { at: "opened", address: "t81" }]])));
  assert.deepEqual(results.map((r) => [r.key, r.ok, r.reason]), [["w1", false, "its conductor no longer runs at t81"]]);
  assert.equal(m.calls.filter((a) => a[0] === "run" || a[0] === "send").length, 0);
});

test("openSessions opens nothing when it cannot list the terminals to check which sessions run", async () => {
  const e = saved({ sessionId: "s1", address: "t4" });
  const m = machine({ terminals: [] });
  const hc = m.io.hc;
  m.io.hc = async (args) => (args[0] === "ls" ? { code: 1, stdout: "", stderr: "core not running" } : hc(args));
  const results = await openSessions(m.io, [e], [e]);
  assert.deepEqual(results.map((r) => [r.key, r.ok]), [["s1", false]]);
  assert.match(results[0].reason, /could not check which sessions run: .*core not running/);
  assert.equal(m.calls.filter((a) => a[0] === "run" || a[0] === "send").length, 0);
});

test("openSessions sends nothing to a terminal whose Claude holds another session", async () => {
  const e = saved({ sessionId: "s1", address: "t4" });
  const m = machine({ terminals: [claudeTerm("t4", 4)], files: { [pidPath(4)]: pidText("s9") } });
  const results = await openSessions(m.io, [e], [e]);
  assert.deepEqual(results.map((r) => [r.key, r.ok, r.address, r.reason]), [["s1", false, "t4", "its terminal runs another Claude session"]]);
  assert.equal(m.calls.filter((a) => a[0] === "run" || a[0] === "send").length, 0);
});

test("openSessions keeps a blocked row's own reason when it cannot list the terminals", async () => {
  const w = saved({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1" });
  const m = machine({ terminals: [] });
  const hc = m.io.hc;
  m.io.hc = async (args) => (args[0] === "ls" ? { code: 1, stdout: "", stderr: "core not running" } : hc(args));
  const results = await openSessions(m.io, [w], [w]);
  assert.deepEqual(results.map((r) => [r.key, r.ok, r.reason]), [["w1", false, "its conductor is not in the save"]]);
});

test("openSessions uses the look at the terminals it is given instead of making its own", async () => {
  const e = saved({ sessionId: "s1", address: "t4" });
  const m = machine({ terminals: [{ address: "t4", state: "finished" }] });
  const results = await openSessions(m.io, [e], [e], () => {}, new Map([["s1", "t7"]]));
  assert.deepEqual(results.map((r) => [r.key, r.ok, r.address]), [["s1", true, "t7"]]);
  assert.equal(m.calls.filter((a) => a[0] === "ls" || a[0] === "run").length, 0);
});

test("runningSessions maps each session a live Claude terminal's pid file holds to that terminal", async () => {
  const m = machine({ terminals: [claudeTerm("t7", 7), claudeTerm("t8", 8), shellTerm("t9"), { ...claudeTerm("t10", 10), state: "finished" }],
    files: { [pidPath(7)]: pidText("s1"), [pidPath(8)]: "{}", [pidPath(10)]: pidText("s3") } });
  assert.deepEqual([...(await runningSessions(m.io))], [["s1", "t7"]]);
});


// ---- the save file on disk ----

const oneClaude = (id = "s1", pid = 100, address = "t4") => ({ terminals: [claudeTerm(address, pid)], files: { [pidPath(pid)]: pidText(id), [transcript("D--repo", id)]: "{}\n" } });

const brokenCopies = (m) => Object.keys(m.files).filter((p) => p.startsWith(APP + "/data/session-restore.broken-")).sort();

for (const [what, text] of [["text that does not parse", '{"version":1,"current":['], ["JSON that is not a save", '{"current":{},"restore":[]}']]) {
  test("saveOnce over a save file with " + what + " copies it aside first, then writes the save", async () => {
    const m = machine({ ...oneClaude() });
    m.files[savePath(APP)] = text;
    const { save, copied } = await saveOnce(m.io);
    assert.deepEqual(brokenCopies(m), [copied]);
    assert.equal(m.files[copied], text);
    assert.deepEqual(JSON.parse(m.files[savePath(APP)]).sessions.map((e) => e.sessionId), ["s1"]);
    assert.deepEqual(save.sessions.map((e) => e.sessionId), ["s1"]);
  });
}

test("a save file broken the same way twice is copied once, and broken another way is copied again", async () => {
  const m = machine({ ...oneClaude() });
  m.files[savePath(APP)] = "{";
  const first = await saveAndSummarize(m.io);
  m.files[savePath(APP)] = "{";
  const again = await saveAndSummarize(m.io);
  assert.equal(again.summary.saveCopied, first.summary.saveCopied);
  assert.deepEqual(brokenCopies(m), [first.summary.saveCopied]);
  m.files[savePath(APP)] = "[";
  const other = await saveAndSummarize(m.io);
  assert.notEqual(other.summary.saveCopied, first.summary.saveCopied);
  assert.deepEqual(brokenCopies(m), [first.summary.saveCopied, other.summary.saveCopied].sort());
  assert.deepEqual([m.files[first.summary.saveCopied], m.files[other.summary.saveCopied]], ["{", "["]);
});

test("a save whose write is retried copies the broken save file once", async () => {
  const m = machine({ ...oneClaude() });
  m.files[savePath(APP)] = "{";
  const write = m.io.write;
  let failed = false;
  m.io.write = async (p, ...a) => { if (p === savePath(APP) && !failed) { failed = true; throw new Error("stale"); } return write(p, ...a); };
  await saveOnce(m.io);
  assert.equal(failed, true);
  assert.equal(brokenCopies(m).length, 1);
});

test("a save file whose read gives null is copied byte for byte before it is written over", async () => {
  const nullRead = new Set([savePath(APP)]);
  const m = machine({ ...oneClaude(), nullRead });
  m.files[savePath(APP)] = "\u0000\u00ffnot text";
  const write = m.io.write, order = [];
  m.io.write = (p, ...a) => { order.push(p === savePath(APP) ? "save" : p); return write(p, ...a); };
  const writeBytes = m.io.writeBytes;
  m.io.writeBytes = (p, b) => { order.push("copy"); return writeBytes(p, b); };
  await saveOnce(m.io).catch(() => {});
  assert.equal(brokenCopies(m).length, 1);
  assert.equal(m.files[brokenCopies(m)[0]], "\u0000\u00ffnot text");
  assert.equal(order[0], "copy");
});

test("removeEntries over a save file that cannot be read copies it aside and returns the copy", async () => {
  const m = machine();
  m.files[savePath(APP)] = "{";
  const { copied } = await removeEntries(m.io, ["s1"]);
  assert.deepEqual(brokenCopies(m), [copied]);
  assert.equal(m.files[copied], "{");
});

test("a save over a good or missing save file copies nothing", async () => {
  const m = machine(oneClaude());
  const first = await saveAndSummarize(m.io);
  const second = await saveAndSummarize(m.io);
  assert.deepEqual([first.summary.saveCopied, second.summary.saveCopied, brokenCopies(m)], [null, null, []]);
});

test("with exists rejecting, a missing save file is written, as no file", async () => {
  const m = machine(oneClaude());
  m.io.exists = async () => { throw new Error("outside every granted read root"); };
  const { summary } = await saveAndSummarize(m.io);
  assert.equal(summary.error, null);
  assert.deepEqual(JSON.parse(m.files[savePath(APP)]).sessions.map((e) => e.sessionId), ["s1"]);
});

test("a save that fails after copying the save file still says where the copy is", async () => {
  const m = machine(oneClaude());
  m.files[savePath(APP)] = "{";
  const hc = m.io.hc;
  m.io.hc = async (args) => (args[0] === "ls" ? { code: 1, stdout: "", stderr: "down" } : hc(args));
  const { summary } = await saveAndSummarize(m.io);
  assert.match(summary.error, /down/);
  assert.equal(m.files[summary.saveCopied], "{");
  assert.equal(m.files[savePath(APP)], "{");
});

test("a save that copied on its first try and found the file whole on its retry still says where the copy is", async () => {
  const m = machine(oneClaude());
  m.files[savePath(APP)] = "{";
  const write = m.io.write;
  let once = false;
  m.io.write = async (p, ...a) => {
    if (p === savePath(APP) && !once) { once = true; m.files[p] = JSON.stringify({ version: 1, core: "h1", current: [], restore: [] }); throw new Error("stale"); }
    return write(p, ...a);
  };
  const { copied } = await saveOnce(m.io);
  assert.equal(once, true);
  assert.equal(m.files[copied], "{");
});

const openLog = (m) => (m.files[openLogPath(APP)] ?? "").split("\n").filter(Boolean).map((l) => JSON.parse(l));

test("a failed open is written to the open log with when, which session, where and why", async () => {
  const e = saved({ sessionId: "s1", address: "t4", title: "work" });
  const m = machine({ terminals: [claudeTerm("t4", 4)], files: { [pidPath(4)]: pidText("s9") } });
  await openSessions(m.io, [e], [e]);
  assert.deepEqual(openLog(m), [{ at: new Date(1_000_000).toISOString(), sessionId: "s1", title: "work", address: "t4", reason: "its terminal runs another Claude session" }]);
});

test("an open that cannot list the terminals is written to the open log too", async () => {
  const e = saved({ sessionId: "s1", address: "t4" });
  const m = machine({ terminals: [] });
  const hc = m.io.hc;
  m.io.hc = async (args) => (args[0] === "ls" ? { code: 1, stdout: "", stderr: "core not running" } : hc(args));
  await openSessions(m.io, [e], [e]);
  assert.deepEqual(openLog(m).map((l) => l.sessionId), ["s1"]);
  assert.match(openLog(m)[0].reason, /could not check which sessions run/);
});

test("an open that succeeds writes nothing to the open log", async () => {
  const e = saved({ sessionId: "s1", address: "t4" });
  const m = machine({ terminals: [shellTerm("t4")] });
  const results = await openSessions(m.io, [e], [e]);
  assert.deepEqual(results.map((r) => r.ok), [true]);
  assert.equal(openLogPath(APP) in m.files, false);
});

test("the open log adds to what is there and keeps only the newest lines", async () => {
  const old = Array.from({ length: OPEN_LOG_LINES }, (_, i) => JSON.stringify({ n: i })).join("\n") + "\n";
  const e = saved({ sessionId: "s1", address: "t4" });
  const m = machine({ terminals: [claudeTerm("t4", 4)], files: { [pidPath(4)]: pidText("s9"), [openLogPath(APP)]: old } });
  await openSessions(m.io, [e], [e]);
  const lines = openLog(m);
  assert.equal(lines.length, OPEN_LOG_LINES);
  assert.deepEqual([lines[0], lines.at(-1).sessionId], [{ n: 1 }, "s1"]);
});

test("an open log that cannot be written leaves the open's results as they are", async () => {
  const e = saved({ sessionId: "s1", address: "t4" });
  const m = machine({ terminals: [claudeTerm("t4", 4)], files: { [pidPath(4)]: pidText("s9") } });
  m.io.write = async () => { throw new Error("disk full"); };
  const results = await openSessions(m.io, [e], [e]);
  assert.deepEqual(results.map((r) => [r.key, r.ok]), [["s1", false]]);
});
