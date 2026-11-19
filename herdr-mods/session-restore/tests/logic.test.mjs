// Pure logic of session-restore: run with node --test herdr-mods/session-restore/tests
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  keptFlags, nextSave, coreIdentity, planOpen, placement, resumeArgv, shellLine, isClaude, isShell, summarize, linkParents, openable, groupsOf, chipState, openProgress, groupProgress, batchResult, startOpen, endOpen, reopenable, withMarks, settleOpen, withoutRows, keepLive, liveOf, STALE_MS,
  DEFAULT_SETTINGS, parseSettings, staleAfter, parseHistory, withSnapshot, overLimit, trimHistory, withoutSnapshots, mergeSessions, mergeSnapshots, mergeGroups, folderChange, mergeDialog, withRunning, cleanTitle,
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
  assert.equal(summarize(save, { now: 1000 + 4 * 60_000, failed: false, staleMs: staleAfter(1) }).stalled, true);
  assert.equal(summarize(save, { now: 2000, failed: true }).stalled, true);
});

test("chipState: green with the count saved, amber with what can be restored, red when stalled, none before a save", () => {
  const s = (over) => ({ restorable: 0, working: 0, saved: 0, stalled: false, sig: "", ...over });
  assert.deepEqual(chipState(s({ saved: 18 })), { label: "⟲ 18", dot: "green" });
  assert.deepEqual(chipState(s({ saved: 2, restorable: 5 })), { label: "복원할 세션 5", dot: "amber" });
  assert.deepEqual(chipState(s({ saved: 2, restorable: 5, stalled: true })), { label: "save 멈춤", dot: "red" });
  assert.deepEqual(chipState(s({ stalled: true })), { label: "save 멈춤", dot: "red" });
  assert.deepEqual(chipState(null), { label: "save 없음", dot: "dim" });
});

test("chipState shows the open under way over every other state, and not once it has nothing left", () => {
  const stalled = { restorable: 5, working: 0, saved: 0, stalled: true, sig: "" };
  assert.deepEqual(chipState(stalled, { opened: 2, total: 5 }), { label: "여는 중 · 2/5", dot: "green" });
  assert.deepEqual(chipState(null, { opened: 0, total: 1 }), { label: "여는 중 · 0/1", dot: "green" });
  assert.deepEqual(chipState(stalled, { opened: 0, total: 0 }), { label: "save 멈춤", dot: "red" });
});

test("chipState turns red when no save has ended for longer than a stalled save may age", () => {
  const ok = { restorable: 3, working: 0, saved: 4, stalled: false, sig: "" };
  assert.deepEqual(chipState(ok, null, STALE_MS, STALE_MS), { label: "복원할 세션 3", dot: "amber" });
  assert.deepEqual(chipState(ok, null, STALE_MS + 1, STALE_MS), { label: "save 멈춤", dot: "red" });
  assert.deepEqual(chipState(null, null, STALE_MS + 1, STALE_MS), { label: "save 멈춤", dot: "red" });
});

test("openProgress counts only the batch being opened, not rows an earlier open left behind", () => {
  const states = new Map([["old", { at: "opened" }], ["gone", { at: "failed" }], ["a", { at: "opened" }], ["b", { at: "opening" }], ["c", { at: "failed" }]]);
  assert.deepEqual(openProgress(states, new Set(["a", "b", "c"])), { opened: 1, total: 3 });
  assert.equal(openProgress(new Map([["a", { at: "opened" }]]), new Set(["a"])), null);
  assert.equal(openProgress(states, new Set()), null);
});

test("groupProgress counts a space's rows in the batch, not rows an earlier open left opened and now live", () => {
  // A and B were opened by an earlier batch and are live now; C is closed and is the batch being opened.
  const all = [entry({ sessionId: "A", live: true }), entry({ sessionId: "B", live: true }), entry({ sessionId: "C" })];
  const [g] = groupsOf(all);
  const states = new Map([["A", { at: "opened" }], ["B", { at: "opened" }], ["C", { at: "opening" }]]);
  assert.deepEqual(groupProgress(g, states, new Set(["C"])), { opened: 0, total: 1 });
  states.set("C", { at: "opened" });
  assert.deepEqual(groupProgress(g, states, new Set(["C"])), { opened: 1, total: 1 });
  // A space with no row in the batch has nothing under way.
  const other = groupsOf([entry({ sessionId: "D", labels: { "herdr.space": "sp2" } })])[0];
  assert.deepEqual(groupProgress(other, states, new Set(["C"])), { opened: 0, total: 0 });
});

test("batchResult names the batch's opened and failed rows, not those of an earlier open", () => {
  const states = new Map([["old", { at: "opened" }], ["gone", { at: "failed" }], ["a", { at: "opened" }], ["c", { at: "failed" }], ["d", { at: "opened" }]]);
  // b was still opening when the open ended, so its state was cleared.
  assert.deepEqual(batchResult(states, new Set(["a", "b", "c", "d"])), { opened: ["a", "d"], failed: ["c"] });
  // Nothing in the batch has ended (cleared, never opened, or no batch): no result to show.
  assert.equal(batchResult(states, new Set(["b"])), null);
  assert.deepEqual(batchResult(states, new Set(["b", "c"])), { opened: [], failed: ["c"] });
  assert.equal(batchResult(states, new Set()), null);
});

test("startOpen marks every row the open will open, workers brought along included, so the open stays under way until they end", () => {
  // Pressing the conductor c1 brings its worker w1 along; c0 is not part of it.
  const all = family();
  const { states, batch } = startOpen(new Map(), new Set(), [all[2]], all, 1);
  assert.deepEqual([...batch], ["c1", "w1"]);
  assert.deepEqual([...states], [["c1", { at: "opening", open: 1 }], ["w1", { at: "opening", open: 1 }]]);
  // The pressed conductor ends first: the worker it brought is still opening, so the open is too.
  states.set("c1", { at: "opened", address: "t9" });
  assert.deepEqual(openProgress(states, batch), { opened: 1, total: 2 });
  // A conductor open now is skipped by the plan, so it is neither marked nor in the batch.
  all[2].live = true;
  const skip = startOpen(new Map(), new Set(), [all[0]], all, 2);
  assert.deepEqual([...skip.batch], ["w1"]);
  assert.equal(skip.states.has("c1"), false);
});

test("startOpen adds to the batch under way, and starts a new batch once the last one has ended", () => {
  const all = family();
  const going = startOpen(new Map([["c1", { at: "opening", open: 1 }]]), new Set(["c1", "w1"]), [all[1]], all, 2);
  assert.deepEqual([...going.batch], ["c1", "w1", "c0"]);
  assert.deepEqual(going.states.get("c1"), { at: "opening", open: 1 });
  const ended = startOpen(new Map([["c1", { at: "opened" }], ["w1", { at: "failed" }]]), new Set(["c1", "w1"]), [all[1]], all, 3);
  assert.deepEqual([...ended.batch], ["c0"]);
  // The rows the ended batch left are kept for their marks; only the batch is new.
  assert.deepEqual(ended.states.get("w1"), { at: "failed" });
});

test("endOpen clears only the rows its own open left opening, not those of another open still running", () => {
  const states = new Map([["a", { at: "opening", open: 1 }], ["b", { at: "opening", open: 2 }], ["c", { at: "opened" }], ["d", { at: "failed" }]]);
  const next = endOpen(states, 1);
  assert.deepEqual([...next], [["b", { at: "opening", open: 2 }], ["c", { at: "opened" }], ["d", { at: "failed" }]]);
  // Open 2 is still under way after open 1 ends.
  assert.deepEqual(openProgress(next, new Set(["a", "b"])), { opened: 0, total: 2 });
  assert.equal(openProgress(endOpen(next, 2), new Set(["a", "b"])), null);
});

test("a space's Open · N leaves out rows this panel opened, as Open all does", () => {
  // A and W were opened by this panel and the save after it failed, so the save still lists them closed.
  const all = [entry({ sessionId: "A", status: "working" }), entry({ sessionId: "W", parentSession: "A", status: "working" }), entry({ sessionId: "B" })];
  const states = new Map([["A", { at: "opened" }], ["W", { at: "opened" }], ["B", { at: "failed" }]]);
  const [g] = groupsOf(all, states);
  assert.deepEqual(g.open.map(e => e.sessionId), ["B"]);
  assert.equal(g.restorable, 1);
  assert.equal(g.working, 0);
  // The same rows as the footer's Open all.
  assert.deepEqual(all.filter(e => reopenable(e, all, states)).map(e => e.sessionId), ["B"]);
  // Without marks, every closed row that can open is counted.
  const [fresh] = groupsOf(all);
  assert.deepEqual([fresh.restorable, fresh.working], [3, 2]);
});

test("withMarks shows an open a row this panel opened as live at its new address, and one it is opening as live with no address", () => {
  const all = [entry({ sessionId: "A", address: "t4" }), entry({ sessionId: "B", address: "t5" }), entry({ sessionId: "C", address: "t6" }), entry({ sessionId: "D", address: "t7" })];
  const states = new Map([["A", { at: "opened", address: "t91" }], ["B", { at: "opening", open: 1 }], ["C", { at: "failed", reason: "x" }]]);
  const out = withMarks(all, states);
  assert.deepEqual(out.map(e => [e.sessionId, e.live, e.address]), [["A", true, "t91"], ["B", true, null], ["C", false, "t6"], ["D", false, "t7"]]);
  // The save's rows are left as they were.
  assert.deepEqual(all.map(e => [e.live, e.address]), [[false, "t4"], [false, "t5"], [false, "t6"], [false, "t7"]]);
});

test("an open planned over withMarks leaves out the rows this panel opened or another open is opening", () => {
  // C is open in the save; open 1 brought w1 and w2 along; w1 failed and w2 is still opening; w3 was opened.
  const all = [entry({ sessionId: "C", live: true }), entry({ sessionId: "w1", parentSession: "C" }), entry({ sessionId: "w2", parentSession: "C" }), entry({ sessionId: "w3", parentSession: "C" })];
  const states = new Map([["w1", { at: "failed" }], ["w2", { at: "opening", open: 1 }], ["w3", { at: "opened", address: "t93" }]]);
  const { states: next, batch } = startOpen(states, new Set(["w1", "w2", "w3"]), [all[1]], withMarks(all, states), 2);
  assert.deepEqual(next.get("w1"), { at: "opening", open: 2 });
  assert.deepEqual(next.get("w2"), { at: "opening", open: 1 });
  assert.deepEqual(next.get("w3"), { at: "opened", address: "t93" });
  assert.deepEqual([...batch], ["w1", "w2", "w3"]);
});

test("settleOpen writes a result only to a row its own open still marks, so another open stays under way", () => {
  const states = new Map([["a", { at: "opening", open: 1 }], ["b", { at: "opening", open: 2 }]]);
  const one = settleOpen(states, 1, { key: "a", ok: true, address: "t9" }, 7);
  assert.deepEqual(one.get("a"), { at: "opened", address: "t9", since: 7 });
  const stray = settleOpen(one, 1, { key: "b", ok: false, reason: "late" });
  assert.deepEqual(stray.get("b"), { at: "opening", open: 2 });
  assert.deepEqual(openProgress(stray, new Set(["a", "b"])), { opened: 1, total: 2 });
  // A row taken out of the panel while it opened stays out.
  assert.equal(settleOpen(new Map(), 1, { key: "c", ok: true, address: "t1" }).has("c"), false);
  assert.deepEqual(settleOpen(states, 2, { key: "b", ok: false, reason: "why" }).get("b"), { at: "failed", reason: "why" });
});

test("withoutRows forgets the removed rows' results and leaves an open's opening mark to that open", () => {
  const states = new Map([["a", { at: "failed", reason: "x" }], ["b", { at: "opening", open: 2 }], ["c", { at: "opened", address: "t1" }], ["d", { at: "failed" }]]);
  const next = withoutRows(states, ["a", "b", "c"]);
  assert.deepEqual([...next], [["b", { at: "opening", open: 2 }], ["d", { at: "failed" }]]);
  // Open 2 is still under way, and its own end clears the mark.
  assert.deepEqual(openProgress(next, new Set(["b"])), { opened: 0, total: 1 });
  assert.equal(endOpen(next, 2).has("b"), false);
});

test("settleOpen keeps the address a failed open watched, and withMarks plans over it as an opened row's address", () => {
  const states = settleOpen(new Map([["a", { at: "opening", open: 1 }]]), 1, { key: "a", ok: false, address: "t91", reason: "still starting" }, 5);
  assert.deepEqual(states.get("a"), { at: "failed", reason: "still starting", address: "t91" });
  const [e] = withMarks([{ key: "a", sessionId: "a", address: "t4", live: false }], states);
  assert.deepEqual([e.live, e.address], [false, "t91"]);
});

test("settleOpen stamps an opened mark with when it landed", () => {
  const states = settleOpen(new Map([["a", { at: "opening", open: 1 }]]), 1, { key: "a", ok: true, address: "t9" }, 5);
  assert.deepEqual(states.get("a"), { at: "opened", address: "t9", since: 5 });
});

test("keepLive drops an opened mark a later look does not show held at its address, and keeps the rest", () => {
  const states = new Map([
    ["gone", { at: "opened", address: "t1", since: 10 }],
    ["moved", { at: "opened", address: "t2", since: 10 }],
    ["here", { at: "opened", address: "t3", since: 10 }],
    ["fresh", { at: "opened", address: "t4", since: 30 }],
    ["opening", { at: "opening", open: 1 }],
    ["failed", { at: "failed", reason: "x", address: "t6" }],
    ["unstamped", { at: "opened", address: "t7" }],
  ]);
  const save = { savedAt: 20, current: [{ sessionId: "moved", address: "t9" }, { sessionId: "here", address: "t3" }], restore: [] };
  assert.deepEqual([...keepLive(states, liveOf(save), save.savedAt).keys()], ["here", "fresh", "opening", "failed"]);
  assert.equal(keepLive(states, new Map(), undefined), states);
});

test("liveOf maps each session a save lists live to its address", () => {
  assert.deepEqual([...liveOf({ current: [{ sessionId: "a", address: "t1" }], restore: [{ sessionId: "b", address: "t2" }] })], [["a", "t1"]]);
  assert.deepEqual([...liveOf(null)], []);
});


// ---- settings, history, merge, refresh (#83) ----

test("parseSettings fills what is missing or wrong with the defaults: every 10 minutes, 50 saves kept", () => {
  assert.deepEqual(DEFAULT_SETTINGS, { saveEveryMinutes: 10, historyLimit: 50 });
  assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings("not json"), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings('{"saveEveryMinutes": 3}'), { saveEveryMinutes: 3, historyLimit: 50 });
  assert.deepEqual(parseSettings('{"saveEveryMinutes": 0, "historyLimit": -2}'), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings('{"saveEveryMinutes": 2.6, "historyLimit": 7.2}'), { saveEveryMinutes: 3, historyLimit: 7 });
  assert.deepEqual(parseSettings('{"saveEveryMinutes": "5"}'), DEFAULT_SETTINGS);
});

test("parseSettings reads a null historyLimit as no limit", () => {
  assert.deepEqual(parseSettings('{"historyLimit": null}'), { saveEveryMinutes: 10, historyLimit: null });
});

test("staleAfter is three save intervals", () => {
  assert.equal(staleAfter(10), 30 * 60_000);
  assert.equal(staleAfter(1), 3 * 60_000);
});

test("summarize and chipState read stalled against the stale time they are given", () => {
  const save = { savedAt: 0, current: [entry({ sessionId: "a" })], restore: [] };
  assert.equal(summarize(save, { now: 29 * 60_000, failed: false, staleMs: staleAfter(10) }).stalled, false);
  assert.equal(summarize(save, { now: 31 * 60_000, failed: false, staleMs: staleAfter(10) }).stalled, true);
  const ok = { restorable: 0, working: 0, saved: 1, stalled: false, sig: "" };
  assert.equal(chipState(ok, null, 29 * 60_000, staleAfter(10)).dot, "green");
  assert.equal(chipState(ok, null, 31 * 60_000, staleAfter(10)).dot, "red");
});

const snap = (id, at, ids, over = {}) => ({ id, at, entries: ids.map((s) => live(s)), ...over });

test("parseHistory reads a history back, and an empty one when there is none or it does not parse", () => {
  assert.deepEqual(parseHistory(null), { version: 1, saves: [] });
  assert.deepEqual(parseHistory("{"), { version: 1, saves: [] });
  assert.deepEqual(parseHistory('{"version":1,"saves":"x"}'), { version: 1, saves: [] });
  const h = { version: 1, saves: [snap(1, 5, ["a"])] };
  assert.deepEqual(parseHistory(JSON.stringify(h)), h);
});

test("withSnapshot adds the sessions as a new save, newest first, numbered after the highest", () => {
  const h = { version: 1, saves: [snap(4, 10, ["a"]), snap(2, 5, ["b"])] };
  const next = withSnapshot(h, [live("a"), live("c")], { now: 20, limit: 50 });
  assert.deepEqual(next.saves.map((s) => [s.id, s.at, s.entries.map((e) => e.sessionId)]), [[5, 20, ["a", "c"]], [4, 10, ["a"]], [2, 5, ["b"]]]);
});

test("withSnapshot makes no new save when the session list matches the newest one, whatever else changed", () => {
  const h = { version: 1, saves: [snap(1, 10, ["a", "b"])] };
  // Same sessions in another order, with another title: no new save.
  const same = withSnapshot(h, [live("b", { title: "renamed" }), live("a")], { now: 20, limit: 50 });
  assert.equal(same, h);
});

test("withSnapshot makes no save of an empty list", () => {
  const h = { version: 1, saves: [snap(1, 10, ["a"])] };
  assert.equal(withSnapshot(h, [], { now: 20, limit: 50 }), h);
  assert.deepEqual(withSnapshot({ version: 1, saves: [] }, [], { now: 20, limit: 50 }).saves, []);
});

test("withSnapshot keeps the newest limit saves, and all of them with no limit", () => {
  const h = { version: 1, saves: [snap(3, 30, ["c"]), snap(2, 20, ["b"]), snap(1, 10, ["a"])] };
  assert.deepEqual(withSnapshot(h, [live("d")], { now: 40, limit: 2 }).saves.map((s) => s.id), [4, 3]);
  assert.deepEqual(withSnapshot(h, [live("d")], { now: 40, limit: null }).saves.map((s) => s.id), [4, 3, 2, 1]);
});

test("overLimit counts the saves a limit would drop, and trimHistory drops the oldest", () => {
  const h = { version: 1, saves: [snap(3, 30, ["c"]), snap(2, 20, ["b"]), snap(1, 10, ["a"])] };
  assert.equal(overLimit(h, 1), 2);
  assert.equal(overLimit(h, 3), 0);
  assert.equal(overLimit(h, null), 0);
  assert.deepEqual(trimHistory(h, 1).saves.map((s) => s.id), [3]);
  assert.equal(trimHistory(h, null), h);
});

test("withoutSnapshots deletes the saves with the given ids", () => {
  const h = { version: 1, saves: [snap(3, 30, ["c"]), snap(2, 20, ["b"]), snap(1, 10, ["a"])] };
  assert.deepEqual(withoutSnapshots(h, [3]).saves.map((s) => s.id), [2, 1]);
  assert.deepEqual(withoutSnapshots(h, [3, 1]).saves.map((s) => s.id), [2]);
});

test("mergeSessions lists every session of the saves once, with the newest save's record and the saves it is in", () => {
  const older = snap(1, 10, ["a", "b"]);
  older.entries[1] = live("b", { tabName: "2" });
  const newer = snap(2, 20, ["b", "c"]);
  newer.entries[0] = live("b", { tabName: "3" });
  const rows = mergeSessions([older, newer]);
  assert.deepEqual(rows.map((r) => [r.entry.sessionId, r.in]), [["b", [2, 1]], ["c", [2]], ["a", [1]]]);
  assert.equal(rows[0].entry.tabName, "3");
});

test("mergeSnapshots makes a new save of the kept sessions from several saves, and the saves stay", () => {
  const h = { version: 1, saves: [snap(3, 30, ["c"]), snap(2, 20, ["b", "c"]), snap(1, 10, ["a"])] };
  const next = mergeSnapshots(h, [1, 3, 2], ["a", "c"], { now: 40, limit: 50 });
  assert.deepEqual(next.saves.map((s) => s.id), [4, 3, 2, 1]);
  assert.deepEqual(next.saves[0].from, [1, 2, 3]);
  assert.equal(next.saves[0].at, 40);
  assert.deepEqual(next.saves[0].entries.map((e) => e.sessionId), ["c", "a"]);
});

test("mergeSnapshots makes nothing when nothing is kept or fewer than two saves are found", () => {
  const h = { version: 1, saves: [snap(2, 20, ["b"]), snap(1, 10, ["a"])] };
  assert.equal(mergeSnapshots(h, [1, 2], [], { now: 30, limit: 50 }), h);
  assert.equal(mergeSnapshots(h, [1, 9], ["a"], { now: 30, limit: 50 }), h);
});

test("mergeSnapshots keeps the history limit by dropping the oldest saves that are not its sources", () => {
  const h = { version: 1, saves: [snap(4, 40, ["d"]), snap(3, 30, ["c"]), snap(2, 20, ["b"]), snap(1, 10, ["a"])] };
  assert.deepEqual(mergeSnapshots(h, [1, 2], ["a", "b"], { now: 50, limit: 4 }).saves.map((s) => s.id), [5, 4, 2, 1]);
  assert.deepEqual(mergeSnapshots(h, [1, 2], ["a", "b"], { now: 50, limit: 5 }).saves.map((s) => s.id), [5, 4, 3, 2, 1]);
});

test("mergeSnapshots leaves the history over the limit where only its sources would remain", () => {
  const h = { version: 1, saves: [snap(2, 20, ["b"]), snap(1, 10, ["a"])] };
  assert.deepEqual(mergeSnapshots(h, [1, 2], ["a", "b"], { now: 30, limit: 2 }).saves.map((s) => s.id), [3, 2, 1]);
  const over = { version: 1, saves: [snap(5, 50, ["e"]), snap(4, 40, ["d"]), snap(3, 30, ["c"]), snap(2, 20, ["b"]), snap(1, 10, ["a"])] };
  assert.deepEqual(mergeSnapshots(over, [1, 2], ["a", "b"], { now: 60, limit: 2 }).saves.map((s) => s.id), [6, 2, 1]);
});

test("mergeGroups groups the merge's rows by space id, so two spaces with one name stay apart", () => {
  const rows = [
    { entry: live("a", { labels: { "herdr.space": "sp1" }, spaceName: "work" }), in: [1] },
    { entry: live("b", { labels: { "herdr.space": "sp2" }, spaceName: "work" }), in: [1] },
    { entry: live("c", { labels: { "herdr.space": "sp1" }, spaceName: "work" }), in: [1] },
    { entry: live("d", { labels: {}, spaceName: "" }), in: [1] },
  ];
  const groups = mergeGroups(rows);
  assert.deepEqual(groups.map((g) => [g.id, g.name, g.rows.map((r) => r.entry.sessionId)]),
    [["sp1", "work", ["a", "c"]], ["sp2", "work", ["b"]], ["", "", ["d"]]]);
});

test("folderChange reads an empty batch as a released watch, and reloads only for the given files or the folder itself", () => {
  const dir = "C:/Users/U/.config/herdr-app/data";
  const files = [dir + "/session-restore.history.json", dir + "/session-restore.settings.json"];
  assert.equal(folderChange([], dir, files), "released");
  assert.equal(folderChange([dir + "/agents/a.json", dir + "/agents/b.json"], dir, files), "skip");
  assert.equal(folderChange([dir + "/session-restore.json", dir + "/session-restore/x.json", dir + "/agents/session-restore.history.json"], dir, files), "skip");
  assert.equal(folderChange([dir + "/agents/a.json", "C:\\Users\\U\\.config\\herdr-app\\data\\session-restore.history.json"], dir, files), "reload");
  assert.equal(folderChange([dir + "/Session-Restore.settings.json"], dir + "/", files), "reload");
  assert.equal(folderChange(["C:\\Users\\U\\.config\\herdr-app\\data\\"], dir, files), "reload");
});

test("folderChange reads a path by its place under the folder, not by the form Herdr writes it in", () => {
  const dir = "C:/Users/U/.config/herdr-app/data";
  const files = [dir + "/session-restore.history.json", dir + "/session-restore.settings.json"];
  assert.equal(folderChange(["\\\\?\\C:\\Users\\U\\.config\\herdr-app\\data\\session-restore.history.json"], dir, files), "reload");
  assert.equal(folderChange(["D:/real/herdr-app/data/session-restore.settings.json"], dir, files), "reload");
  assert.equal(folderChange(["D:/real/herdr-app/data"], dir, files), "reload");
  assert.equal(folderChange([dir + "/session-restore.history.json.tmp"], dir, files), "reload");
  assert.equal(folderChange(["D:/real/herdr-app/data/agents/x.json"], dir, files), "skip");
});

test("mergeDialog opens the merge as a dialog of its own, never under the chip's overlay key", () => {
  const chip = JSON.parse(readFileSync(new URL("../mod.json", import.meta.url), "utf8")).overlay;
  const spec = mergeDialog([3, 1]);
  assert.equal(spec.mod, "session-restore");
  assert.equal(spec.kind, "dialog");
  assert.deepEqual(spec.props, { view: "merge", ids: [3, 1] });
  assert.equal(typeof spec.key, "string");
  assert.notEqual(spec.key, chip.key);
  assert.equal(spec.keep, false);
});

test("cleanTitle drops what an agent puts before its title", () => {
  assert.equal(cleanTitle("✳ fix login"), "fix login");
  assert.equal(cleanTitle("[ ! ] review"), "review");
  assert.equal(cleanTitle(null), "");
});

test("withRunning marks each entry live by what the terminals hold now, at the address that holds it", () => {
  const entries = [live("a", { live: true, address: "t1" }), live("b", { live: false, address: "t2" }), live("c", { live: true, address: "t3" })];
  const out = withRunning(entries, new Map([["b", "t9"], ["c", "t3"]]));
  assert.deepEqual(out.map((e) => [e.sessionId, e.live, e.address]), [["a", false, "t1"], ["b", true, "t9"], ["c", true, "t3"]]);
});
