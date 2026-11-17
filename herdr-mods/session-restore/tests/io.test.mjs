// save.js and open.js against a fake hc and file system: run with node --test herdr-mods/session-restore/tests
import { test } from "node:test";
import assert from "node:assert/strict";
import { saveOnce, savePath, removeEntries } from "../save.js";
import { openSessions } from "../open.js";

const HOME = "C:/Users/U", APP = "C:/Users/U/.config/herdr-app";
const SPACES = [{ id: "sp1", name: "skills", named: false, folder: "", tabs: [{ id: "tb1", name: "1", named: false }] }];

// A fake machine: terminals as hc get answers them, files by path, and every hc call recorded.
function machine({ terminals = [], files = {}, holder = "h1", now = 1_000_000, gone = new Set() } = {}) {
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
  const calls = [], ran = [];
  const ok = (v) => ({ code: 0, stdout: JSON.stringify(v), stderr: "" });
  const io = {
    home: HOME, appHome: APP, now: () => now, spaces: () => SPACES, sleep: async () => {},
    read: async (p) => (p in files ? files[p] : null),
    write: async (p, text, expected) => {
      if ((files[p] ?? null) !== expected) throw new Error("stale");
      files[p] = text;
    },
    run: (command, args) => { ran.push([command, args]); },
    hc: async (args) => {
      calls.push(args);
      if (args[0] === "server") return ok({ holder: { current: true, instance: holder } });
      if (args[0] === "ls") return ok({ terminals: terminals.map((t) => ({ address: t.address, state: t.state, agent: /claude/i.test(t.foreground?.name ?? "") ? "claude-code" : t.foreground?.name })) });
      if (args[0] === "get") {
        const t = look(terminals.find((x) => x.address === args[1]));
        return t ? ok(t) : { code: 1, stdout: "", stderr: "no such terminal" };
      }
      if (args[0] === "send") { resume(terminals.find((x) => x.address === args[1]), args[2].split(" ")); return ok({ sent: true }); }
      if (args[0] === "run") {
        const address = "t" + (90 + calls.filter((c) => c[0] === "run").length);
        const t = { address, state: "live", labels: {} };
        terminals.push(t);
        resume(t, args.slice(args.indexOf("--") + 1));
        return ok({ address });
      }
      if (args[0] === "read") return { code: 0, stdout: (terminals.find((x) => x.address === args[1])?.screen ?? "") + "\n", stderr: "" };
      return { code: 2, stdout: "", stderr: "unexpected" };
    },
  };
  return { io, calls, ran, files };
}

const claudeTerm = (address, pid, extra = {}) => ({
  address, state: "live", title: "work", status: { state: "working" }, cwd: "D:/repo", labels: { "herdr.space": "sp1", "herdr.tab": "tb1", where: "skills / 1" },
  foreground: { name: "claude.EXE", pid, cwd: "D:/repo", argv: ["claude", "--model", "opus", "Read brief.md and do what it says."] }, ...extra,
});
const pidPath = (pid) => HOME + "/.claude/sessions/" + pid + ".json";

test("saveOnce records each live Claude with its session id, flags and place", async () => {
  const m = machine({ terminals: [claudeTerm("t4", 100)], files: { [pidPath(100)]: JSON.stringify({ sessionId: "s1" }) } });
  const { save } = await saveOnce(m.io);
  assert.equal(save.core, "h1");
  assert.deepEqual(save.current.map((e) => [e.sessionId, e.address, e.pid, e.spaceName, e.tabName, e.status]),
    [["s1", "t4", 100, "skills", "1", "working"]]);
  assert.deepEqual(save.current[0].flags, ["--model", "opus"]);
  assert.deepEqual(save.current[0].labels, { "herdr.space": "sp1", "herdr.tab": "tb1" });
  assert.deepEqual(save.restore, []);
  assert.deepEqual(JSON.parse(m.files[savePath(APP)]), save);
});

test("saveOnce on the same holder overwrites current, and a session that ended is not set aside", async () => {
  const prev = { version: 1, core: "h1", savedAt: 1, current: [{ key: "s1", sessionId: "s1", address: "t4", labels: {}, flags: [] }], restore: [] };
  const m = machine({ files: { [savePath(APP)]: JSON.stringify(prev) } });
  const { save } = await saveOnce(m.io);
  assert.deepEqual([save.current, save.restore], [[], []]);
});

test("saveOnce after a core restart sets the last save aside as the restore list", async () => {
  const prev = { version: 1, core: "h0", savedAt: 1, current: [{ key: "s1", sessionId: "s1", address: "t4", labels: {}, flags: [] }], restore: [] };
  const m = machine({ files: { [savePath(APP)]: JSON.stringify(prev) } });
  const { save } = await saveOnce(m.io);
  assert.equal(save.core, "h1");
  assert.deepEqual(save.restore.map((e) => e.sessionId), ["s1"]);
});

test("saveOnce counts a pid file without a session id as unreadable and saves nothing for it", async () => {
  const m = machine({ terminals: [claudeTerm("t4", 100)], files: { [pidPath(100)]: "{\"id\":\"renamed\"}" } });
  const { save, unreadable } = await saveOnce(m.io);
  assert.equal(unreadable, 1);
  assert.deepEqual(save.current, []);
});

test("removeEntries takes the named entries out of the restore list and nothing else", async () => {
  const prev = { version: 1, current: [{ key: "c", sessionId: "c" }], restore: [{ key: "a", sessionId: "a" }, { key: "b", sessionId: "b" }] };
  const m = machine({ files: { [savePath(APP)]: JSON.stringify(prev) } });
  await removeEntries(m.io, ["a"]);
  const after = JSON.parse(m.files[savePath(APP)]);
  assert.deepEqual([after.restore.map((e) => e.key), after.current.map((e) => e.key)], [["b"], ["c"]]);
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
