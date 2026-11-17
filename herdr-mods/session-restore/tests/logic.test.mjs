// Pure logic of session-restore: run with node --test herdr-mods/session-restore/tests
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  keptFlags, nextSave, coreIdentity, planOpen, placement, resumeArgv, shellLine, isClaude, isShell, summarize, linkParents, openable, groupsOf,
} from "../logic.js";

const WORKER_ARGV = ["C:\\Users\\User\\.local\\bin\\claude.EXE", "--model", "opus", "--effort", "high", "--dangerously-skip-permissions",
  "Read C:\\Users\\User\\AppData\\Local\\Temp\\thegraph\\skills-20261117-0948-51635eac.60.brief.md and do what it says."];

test("keptFlags drops a thegraph worker's task prompt and keeps --model, --effort and the permission flag", () => {
  assert.deepEqual(keptFlags(WORKER_ARGV), ["--model", "opus", "--effort", "high", "--dangerously-skip-permissions"]);
});

test("keptFlags keeps a value flag's value and drops the prompt after it", () => {
  assert.deepEqual(keptFlags(["claude", "--permission-mode", "plan", "fix the login bug"]), ["--permission-mode", "plan"]);
  assert.deepEqual(keptFlags(["claude", "--model=opus", "hi"]), ["--model=opus"]);
  assert.deepEqual(keptFlags(["claude", "only a prompt"]), []);
  assert.deepEqual(keptFlags(["claude", "--verbose", "--", "a prompt after --"]), ["--verbose"]);
});

test("keptFlags drops the flags that pick a session, since the restore passes its own --resume", () => {
  assert.deepEqual(keptFlags(["claude", "--resume", "e4c8b9a1", "--model", "sonnet"]), ["--model", "sonnet"]);
  assert.deepEqual(keptFlags(["claude", "-r", "--verbose"]), ["--verbose"]);
  assert.deepEqual(keptFlags(["claude", "-c", "--session-id", "u-1", "--fork-session", "--effort", "low"]), ["--effort", "low"]);
  assert.deepEqual(keptFlags(["claude", "-p", "--output-format", "json", "q"]), ["--output-format", "json"]);
});

test("keptFlags drops the flags that would make a new place on resume: a worktree, tmux, the desktop app, a cloud environment", () => {
  assert.deepEqual(keptFlags(["claude", "-w", "feat", "--tmux", "--desktop", "--environment", "ccpool_1", "--model", "opus", "go"]), ["--model", "opus"]);
  assert.deepEqual(keptFlags(["claude", "--worktree", "--tmux=classic", "--effort", "low"]), ["--effort", "low"]);
});

test("keptFlags reads variadic and optional values the way Claude's own parser does", () => {
  // A variadic flag takes every word up to the next flag, so nothing after it is a prompt.
  assert.deepEqual(keptFlags(["claude", "--add-dir", "a", "b", "--model", "x"]), ["--add-dir", "a", "b", "--model", "x"]);
  // An optional value is taken only when the next word is not a flag.
  assert.deepEqual(keptFlags(["claude", "--debug", "--verbose", "go"]), ["--debug", "--verbose"]);
  assert.deepEqual(keptFlags(["claude", "--debug", "hooks", "--verbose"]), ["--debug", "hooks", "--verbose"]);
});

const entry = (over) => ({ key: over.sessionId, address: "t1", parent: null, status: "idle", live: false, run: null, pid: null,
  labels: { "herdr.space": "sp1", "herdr.tab": "tb1" }, flags: [], ...over });

const live = (sessionId, over = {}) => entry({ sessionId, address: "t-" + sessionId, ...over });

test("nextSave replaces current with the sessions alive now, so one that ended leaves it", () => {
  const prev = { core: "h1", current: [live("a"), live("b")], restore: [] };
  const next = nextSave(prev, [live("b"), live("c")], { core: "h1", now: 5 });
  assert.deepEqual(next.current.map(e => e.sessionId), ["b", "c"]);
  // On the same holder nothing goes to restore: a session that ended (exit or crash) is not offered.
  assert.deepEqual(next.restore, []);
  assert.equal(next.savedAt, 5);
});

test("nextSave on a new core holder sets the previous run's last save aside as the restore list", () => {
  const prev = { core: "h1", current: [live("a"), live("b")], restore: [] };
  const next = nextSave(prev, [], { core: "h2", now: 5 });
  assert.deepEqual(next.restore.map(e => e.sessionId), ["a", "b"]);
  assert.deepEqual(next.current, []);
  assert.equal(next.core, "h2");
});

test("nextSave keeps the restore list across saves until an entry is open again", () => {
  const prev = { core: "h2", current: [], restore: [live("a"), live("b")] };
  const same = nextSave(prev, [], { core: "h2", now: 6 });
  assert.deepEqual(same.restore.map(e => e.sessionId), ["a", "b"]);
  const opened = nextSave(prev, [live("a", { address: "t9" })], { core: "h2", now: 7 });
  assert.deepEqual(opened.restore.map(e => e.sessionId), ["b"]);
  assert.deepEqual(opened.current.map(e => [e.sessionId, e.address]), [["a", "t9"]]);
});

test("nextSave on another new holder keeps what was still waiting, behind the newer save", () => {
  const prev = { core: "h2", current: [live("c")], restore: [live("a"), live("c")] };
  const next = nextSave(prev, [], { core: "h3", now: 8 });
  assert.deepEqual(next.restore.map(e => e.sessionId), ["c", "a"]);
});

test("nextSave starts with no restore list when there was no save", () => {
  assert.deepEqual(nextSave(null, [live("a")], { core: "h1", now: 1 }).restore, []);
});

test("linkParents marks a worker only when its parent terminal is a saved Claude", () => {
  const out = linkParents([live("c", { address: "t4" }), live("w", { address: "t5", parent: "t4" }), live("x", { address: "t6", parent: "t3n" })]);
  assert.deepEqual(out.map(e => [e.sessionId, e.parentSession]), [["c", null], ["w", "c"], ["x", null]]);
});

test("coreIdentity is the current holder's instance", () => {
  const status = { holder: { current: true, instance: "b573", pid: 22380 }, pid: 22312 };
  assert.equal(coreIdentity(status), "b573");
  assert.equal(coreIdentity({ pid: 22312, uptime_ms: 5000 }, 10_000), "core-22312-5000");
});

const family = () => [
  entry({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1", status: "working" }),
  entry({ sessionId: "c0", address: "t2", status: "idle" }),
  entry({ sessionId: "c1", address: "t4", status: "working" }),
];

test("planOpen opens a conductor before its worker, and a worker never alone", () => {
  const all = family();
  const plan = planOpen([all[0]], all);
  assert.deepEqual(plan.map(s => s.entry.sessionId), ["c1", "w1"]);
  assert.equal(plan[1].conductor, "c1");
  assert.equal(plan[0].conductor, null);
});

test("planOpen puts working conductors first and brings each one's workers after it", () => {
  const plan = planOpen(family(), family());
  assert.deepEqual(plan.map(s => s.entry.sessionId), ["c1", "w1", "c0"]);
  // Picked idle one first: the working one still opens first.
  const all = family();
  assert.deepEqual(planOpen([all[1], all[2]], all).map(s => s.entry.sessionId), ["c1", "w1", "c0"]);
});

test("planOpen skips a session already open and still names it as the worker's conductor", () => {
  const all = family();
  all[2].live = true;
  const plan = planOpen([all[0]], all);
  assert.deepEqual(plan.map(s => [s.entry.sessionId, s.skip]), [["c1", true], ["w1", false]]);
});

test("planOpen blocks a worker whose conductor is in neither list, and opens it under a conductor open now", () => {
  const w = entry({ sessionId: "w1", address: "t5", parent: "t4", parentSession: "c1" });
  assert.equal(openable(w, [w]), false);
  assert.deepEqual(planOpen([w], [w]).map(s => [s.entry.sessionId, Boolean(s.blocked)]), [["w1", true]]);
  const c = entry({ sessionId: "c1", address: "t9", live: true });
  assert.deepEqual(planOpen([w], [w, c]).map(s => [s.entry.sessionId, s.skip, s.conductor]), [["c1", true, null], ["w1", false, "c1"]]);
});

const chain = () => [
  entry({ sessionId: "W2", address: "t7", parentSession: "W1" }),
  entry({ sessionId: "W1", address: "t6", parentSession: "C" }),
  entry({ sessionId: "C", address: "t5" }),
];

test("planOpen walks a chain of workers from the top: each one once, every one under its own conductor", () => {
  const all = chain();
  const plan = planOpen([all[0]], all);
  assert.deepEqual(plan.map(s => [s.entry.sessionId, s.conductor]), [["C", null], ["W1", "C"], ["W2", "W1"]]);
  assert.deepEqual(planOpen(all, all).map(s => s.entry.sessionId), ["C", "W1", "W2"]);
});

test("a worker whose conductor cannot be opened cannot be opened either", () => {
  const all = chain().filter(e => e.sessionId !== "C");
  assert.equal(openable(all[0], all), false);
  assert.deepEqual(planOpen([all[0]], all).map(s => [s.entry.sessionId, Boolean(s.blocked)]), [["W2", true]]);
});

test("groupsOf draws every link of a chain, each under the one that started it", () => {
  const groups = groupsOf(chain());
  assert.deepEqual(groups.flatMap(g => g.rows.map(r => [r.entry.sessionId, r.depth])), [["C", 0], ["W1", 1], ["W2", 2]]);
  assert.equal(summarize({ restore: chain(), current: [] }, { now: 0 }).restorable, 3);
});

const SPACES = [{ id: "sp1", name: "skills", named: false, tabs: [{ id: "tb1", name: "1", named: false }] }];

test("placement uses the saved space and tab when both are still there", () => {
  const e = entry({ sessionId: "s1", spaceName: "skills", spaceNamed: false, tabName: "1", tabNamed: false });
  assert.deepEqual(placement(e, SPACES), { labels: { "herdr.space": "sp1", "herdr.tab": "tb1" }, renames: [] });
  // Named, and still there: nothing to rename.
  assert.deepEqual(placement({ ...e, spaceNamed: true, tabNamed: true, tabName: "fix login" }, SPACES).renames, []);
});

test("placement with the tab gone keeps the space and names the new tab as it was named", () => {
  const e = entry({ sessionId: "s1", labels: { "herdr.space": "sp1", "herdr.tab": "tbX" }, tabName: "fix login", tabNamed: true });
  assert.deepEqual(placement(e, SPACES), {
    labels: { "herdr.space": "sp1", "herdr.tab": "tbX" },
    renames: [{ command: "tab.rename", args: { id: "tbX", name: "fix login" } }],
  });
});

test("placement with the space gone makes a new space and gives it the saved name", () => {
  const e = entry({ sessionId: "s1", labels: { "herdr.space": "spX", "herdr.tab": "tbX" }, spaceName: "work", spaceNamed: true, tabName: "2", tabNamed: false });
  assert.deepEqual(placement(e, SPACES), {
    labels: { "herdr.space": "spX", "herdr.tab": "tbX" },
    renames: [{ command: "space.rename", args: { id: "spX", name: "work" } }],
  });
  // An unnamed space follows its first terminal's folder, which is the saved cwd: no rename.
  const unnamed = { ...e, spaceNamed: false };
  assert.deepEqual(placement(unnamed, SPACES).renames, []);
});

test("resumeArgv resumes the saved session with the saved flags and nothing after them", () => {
  assert.deepEqual(resumeArgv(entry({ sessionId: "e4c8", flags: ["--model", "opus", "--dangerously-skip-permissions"] })),
    ["claude", "--resume", "e4c8", "--model", "opus", "--dangerously-skip-permissions"]);
});

test("shellLine leaves a line with nothing to quote as it is", () => {
  const argv = ["claude", "--resume", "e4c8-9a", "--model", "opus"];
  for (const shell of ["powershell.exe", "pwsh.exe", "bash", "cmd.exe"]) assert.equal(shellLine(argv, shell), "claude --resume e4c8-9a --model opus");
});

test("shellLine hands PowerShell the words after --%, quoted as Windows parses a command line", () => {
  const argv = ["claude", "--resume", "e4c8", "--settings", '{"a":1}', "--append-system-prompt", 'say "hi" C:\\dir\\'];
  const line = 'claude --% --resume e4c8 --settings "{\\"a\\":1}" --append-system-prompt "say \\"hi\\" C:\\dir\\\\"';
  assert.equal(shellLine(argv, "powershell.exe"), line);
  assert.equal(shellLine(argv, "pwsh.exe"), line);
  assert.equal(shellLine(argv, "cmd.exe"), line.replace(" --%", ""));
});

test("shellLine quotes for a POSIX shell with single quotes", () => {
  assert.equal(shellLine(["claude", "--append-system-prompt", "it's long"], "bash"), "claude --append-system-prompt 'it'\\''s long'");
});

test("isClaude and isShell read a terminal's foreground program", () => {
  assert.equal(isClaude({ name: "claude.EXE", argv: WORKER_ARGV }), true);
  assert.equal(isClaude({ name: "node", argv: ["node", "claude.js"] }), false);
  assert.equal(isShell({ name: "pwsh.exe" }), true);
  assert.equal(isShell({ name: "claude.EXE" }), false);
});

test("summarize counts what can be restored and changes its sig only when that does", () => {
  const save = { savedAt: 1000, current: [entry({ sessionId: "a" })], restore: [entry({ sessionId: "b", status: "working" }), entry({ sessionId: "c" }),
    entry({ sessionId: "w", parentSession: "gone" })] };
  const s = summarize(save, { now: 2000, failed: false });
  // The orphan worker is not counted: it cannot be opened.
  assert.deepEqual({ ...s, sig: undefined }, { restorable: 2, working: 1, saved: 1, stalled: false, sig: undefined });
  const again = summarize({ ...save, savedAt: 1500 }, { now: 2500, failed: false });
  assert.equal(again.sig, s.sig);
  assert.equal(summarize(save, { now: 1000 + 4 * 60_000, failed: false }).stalled, true);
  assert.equal(summarize(save, { now: 2000, failed: true }).stalled, true);
});
