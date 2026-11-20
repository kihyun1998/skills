// Pure logic of session-restore: run with node --test herdr-mods/session-restore/tests
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  keptFlags, nextSave, coreIdentity, planOpen, placement, resumeArgv, shellLine, isClaude, isShell, summarize, linkParents, openable, groupsOf, chipState, openProgress, groupProgress, batchResult, startOpen, endOpen, reopenable, withMarks, settleOpen, withoutRows, keepLive, liveOf, STALE_MS,
  DEFAULT_SETTINGS, parseSettings, staleAfter, parseHistory, withSnapshot, overLimit, trimHistory, withoutSnapshots, mergeSessions, mergeSnapshots, goneSaves, mergeGroups, folderChange, mergeDialog, withRunning, cleanTitle, digitsOnly, clampWhole, SETTING_BOUNDS,
  IDLE, begin, press, finish, free, busyWith, anyBusy, errorAt, dismiss, ifUnchanged, afterDelete, withLook, arrive, deletingPicked,
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
  assert.deepEqual(chipState(s({ saved: 2, restorable: 5 })), { label: "5 to restore", dot: "amber" });
  assert.deepEqual(chipState(s({ saved: 2, restorable: 5, stalled: true })), { label: "Save stalled", dot: "red" });
  assert.deepEqual(chipState(s({ stalled: true })), { label: "Save stalled", dot: "red" });
  assert.deepEqual(chipState(null), { label: "Not saved yet", dot: "dim" });
});

test("chipState shows the open under way over every other state, and not once it has nothing left", () => {
  const stalled = { restorable: 5, working: 0, saved: 0, stalled: true, sig: "" };
  assert.deepEqual(chipState(stalled, { opened: 2, total: 5 }), { label: "Opening 2/5", dot: "green" });
  assert.deepEqual(chipState(null, { opened: 0, total: 1 }), { label: "Opening 0/1", dot: "green" });
  assert.deepEqual(chipState(stalled, { opened: 0, total: 0 }), { label: "Save stalled", dot: "red" });
});

test("chipState turns red when no save has ended for longer than a stalled save may age", () => {
  const ok = { restorable: 3, working: 0, saved: 4, stalled: false, sig: "" };
  assert.deepEqual(chipState(ok, null, STALE_MS, STALE_MS), { label: "3 to restore", dot: "amber" });
  assert.deepEqual(chipState(ok, null, STALE_MS + 1, STALE_MS), { label: "Save stalled", dot: "red" });
  assert.deepEqual(chipState(null, null, STALE_MS + 1, STALE_MS), { label: "Save stalled", dot: "red" });
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
  assert.deepEqual(DEFAULT_SETTINGS, { saveEveryMinutes: 10, historyLimit: 50, autoSave: true });
  assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings("not json"), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings('{"saveEveryMinutes": 3}'), { saveEveryMinutes: 3, historyLimit: 50, autoSave: true });
  assert.deepEqual(parseSettings('{"saveEveryMinutes": 0, "historyLimit": -2}'), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings('{"saveEveryMinutes": 2.6, "historyLimit": 7.2}'), { saveEveryMinutes: 3, historyLimit: 7, autoSave: true });
  assert.deepEqual(parseSettings('{"saveEveryMinutes": "5"}'), DEFAULT_SETTINGS);
});

test("parseSettings reads a null historyLimit as no limit", () => {
  assert.deepEqual(parseSettings('{"historyLimit": null}'), { saveEveryMinutes: 10, historyLimit: null, autoSave: true });
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

test("parseHistory reads a history back, an empty one when there is none, and null when it does not parse or is not a history", () => {
  assert.deepEqual(parseHistory(null), { version: 1, saves: [] });
  assert.equal(parseHistory("{"), null);
  assert.equal(parseHistory('{"version":1,"saves":"x"}'), null);
  assert.equal(parseHistory('{"saves":{}}'), null);
  assert.equal(parseHistory("null"), null);
  assert.equal(parseHistory('{"version":1,"saves":[1,"x"]}'), null);
  assert.equal(parseHistory('{"version":1,"saves":[{"id":1,"at":1}]}'), null);
  assert.equal(parseHistory('{"version":1,"saves":[null]}'), null);
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

test("a save after the newest save is deleted takes a new id, not the deleted one", () => {
  const h = { version: 1, saves: [snap(4, 40, ["d"]), snap(3, 30, ["c"]), snap(1, 10, ["a"])] };
  const made = withSnapshot(withoutSnapshots(h, [4]), [live("x")], { now: 50, limit: 50 });
  assert.deepEqual(made.saves.map((s) => s.id), [5, 3, 1]);
  assert.equal(made.lastId, 5);
});

test("a history file with no lastId keeps the deleted ids from coming back", () => {
  const h = { version: 1, saves: [snap(4, 40, ["d"]), snap(3, 30, ["c"])] };
  const gone = withoutSnapshots(h, [4, 3]);
  assert.deepEqual(gone.saves, []);
  assert.equal(gone.lastId, 4);
  assert.deepEqual(withSnapshot(gone, [live("x")], { now: 50, limit: 50 }).saves.map((s) => s.id), [5]);
});

test("lastId below the ids present, or not a whole number, gives way to the highest id present", () => {
  for (const lastId of [2, "9", 7.5, null, 1e300, -3]) {
    const h = { version: 1, lastId, saves: [snap(4, 40, ["d"])] };
    assert.deepEqual(withSnapshot(h, [live("x")], { now: 50, limit: 50 }).saves.map((s) => s.id), [5, 4]);
  }
});

test("a lastId at the end of the safe numbers gives no id twice", () => {
  let h = { version: 1, lastId: Number.MAX_SAFE_INTEGER, saves: [snap(4, 40, ["d"])] };
  h = withSnapshot(h, [live("x")], { now: 50, limit: 50 });
  h = withSnapshot(h, [live("y")], { now: 60, limit: 50 });
  const ids = h.saves.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(Number.isSafeInteger));
});

test("a save with no id keeps lastId at a delete, and the next save still takes a whole id", () => {
  const h = { version: 1, lastId: 10, saves: [snap(3, 30, ["c"]), { at: 5, entries: [live("a")] }] };
  const gone = withoutSnapshots(h, [3]);
  assert.equal(gone.lastId, 10);
  assert.equal(withSnapshot(gone, [live("x")], { now: 50, limit: 50 }).saves[0].id, 11);
});

test("a merge after the newest save is deleted takes a new id, and a dialog on the deleted save makes nothing", () => {
  const h = { version: 1, saves: [snap(4, 40, ["d"]), snap(3, 30, ["c"]), snap(1, 10, ["a"])] };
  const after = withSnapshot(withoutSnapshots(h, [4]), [live("x")], { now: 50, limit: 50 });
  assert.equal(mergeSnapshots(after, [4, 1], ["x", "a", "d"], { now: 60 }), after);
  const merged = mergeSnapshots(withoutSnapshots(h, [4]), [3, 1], ["c", "a"], { now: 60 });
  assert.equal(merged.saves[0].id, 5);
  assert.equal(merged.lastId, 5);
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
  const next = mergeSnapshots(h, [1, 3, 2], ["a", "c"], { now: 40 });
  assert.deepEqual(next.saves.map((s) => s.id), [4, 3, 2, 1]);
  assert.deepEqual(next.saves[0].from, [1, 2, 3]);
  assert.equal(next.saves[0].at, 40);
  assert.deepEqual(next.saves[0].entries.map((e) => e.sessionId), ["c", "a"]);
});

test("mergeSnapshots makes nothing when nothing is kept, a save is gone, or fewer than two are given", () => {
  const h = { version: 1, saves: [snap(2, 20, ["b"]), snap(1, 10, ["a"])] };
  assert.equal(mergeSnapshots(h, [1, 2], [], { now: 30 }), h);
  assert.equal(mergeSnapshots(h, [1, 9], ["a"], { now: 30 }), h);
  assert.equal(mergeSnapshots(h, [1], ["a"], { now: 30 }), h);
});

test("mergeSnapshots deletes no save, whichever saves it is made from", () => {
  const h = { version: 1, saves: [snap(4, 40, ["d"]), snap(3, 30, ["c"]), snap(2, 20, ["b"]), snap(1, 10, ["a"])] };
  assert.deepEqual(mergeSnapshots(h, [1, 2], ["a", "b"], { now: 50 }).saves.map((s) => s.id), [5, 4, 3, 2, 1]);
  assert.deepEqual(mergeSnapshots(h, [1, 2, 3], ["a", "b", "c"], { now: 50 }).saves.map((s) => s.id), [5, 4, 3, 2, 1]);
  assert.deepEqual(mergeSnapshots(h, [3, 4], ["c", "d"], { now: 50 }).saves.map((s) => s.id), [5, 4, 3, 2, 1]);
});

test("mergeSnapshots makes nothing when one of its saves is gone, even with two of them left", () => {
  const h = { version: 1, saves: [snap(4, 40, ["d"]), snap(3, 30, ["c"]), snap(2, 20, ["b"])] };
  assert.equal(mergeSnapshots(h, [1, 2, 3], ["a", "b", "c"], { now: 50 }), h);
  assert.deepEqual(goneSaves(h, [1, 2, 3]), [1]);
  assert.deepEqual(goneSaves(h, [3, 1, 9, 2]), [1, 9]);
  assert.deepEqual(goneSaves(h, [2, 4]), []);
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

test("chipState says a save is running under an open and a stalled save, over what can be restored and the count saved", () => {
  const s = (over) => ({ restorable: 0, working: 0, saved: 0, stalled: false, sig: "", ...over });
  assert.deepEqual(chipState(s({ saved: 18 }), null, 0, STALE_MS, true), { label: "Saving", dot: "green", spin: true });
  assert.deepEqual(chipState(s({ saved: 2, restorable: 5 }), null, 0, STALE_MS, true), { label: "Saving", dot: "amber", spin: true });
  assert.deepEqual(chipState(null, null, 0, STALE_MS, true), { label: "Saving", dot: "dim", spin: true });
  assert.deepEqual(chipState(s({ stalled: true }), null, 0, STALE_MS, true), { label: "Save stalled", dot: "red" });
  assert.deepEqual(chipState(s({ saved: 2 }), null, STALE_MS + 1, STALE_MS, true), { label: "Save stalled", dot: "red" });
  assert.deepEqual(chipState(s({ stalled: true }), { opened: 1, total: 3 }, 0, STALE_MS, true), { label: "Opening 1/3", dot: "green" });
  assert.deepEqual(chipState(s({ saved: 18 }), null, 0, STALE_MS, false), { label: "⟲ 18", dot: "green" });
});

test("activity: a target under way is busy until it ends, whether it succeeded or failed", () => {
  const a = begin(IDLE, "delete", [11, 9]);
  assert.equal(busyWith(a, "delete", 11), true);
  assert.equal(busyWith(a, "delete", 9), true);
  assert.equal(busyWith(a, "delete", 10), false);
  assert.equal(busyWith(a, "remove", 11), false);
  assert.equal(busyWith(finish(a, "delete", [11, 9]), "delete", 11), false);
  assert.equal(busyWith(finish(a, "delete", [11, 9], "EBUSY"), "delete", 9), false);
  assert.equal(busyWith(finish(a, "delete", [11]), "delete", 9), true);
  assert.equal(busyWith(IDLE, "delete", 11), false);
});

test("activity: a press on a busy target is ignored, and a press on several leaves only the free ones", () => {
  const a = begin(IDLE, "delete", [11]);
  assert.deepEqual(free(a, "delete", [11]), []);
  assert.deepEqual(free(a, "delete", [10, 11, 12]), [10, 12]);
  assert.deepEqual(free(a, "remove", [11]), [11]);
  assert.deepEqual(free(IDLE, "remove", ["k1", "k2"]), ["k1", "k2"]);
});

test("activity: save, refresh and the open check run one at a time, a save started by any action counting", () => {
  const afterRemove = begin(IDLE, "save", ["remove-1"]);
  assert.deepEqual(free(afterRemove, "save", [null]), []);
  assert.deepEqual(free(IDLE, "save", [null]), [null]);
  assert.deepEqual(free(begin(IDLE, "refresh", [null]), "refresh", [null]), []);
  assert.deepEqual(free(begin(IDLE, "check", ["a", "b"]), "check", ["c"]), []);
  assert.deepEqual(free(begin(IDLE, "check", ["a"]), "refresh", [null]), [null]);
  assert.equal(anyBusy(afterRemove, "save"), true);
  assert.equal(anyBusy(afterRemove, "remove"), false);
  assert.equal(anyBusy(finish(afterRemove, "save", ["remove-1"]), "save"), false);
  assert.equal(anyBusy(IDLE, "check"), false);
});

test("activity: a failure keeps an error where its action lives, until the next action there or a close", () => {
  const failed = finish(begin(IDLE, "delete", [11]), "delete", [11], "EBUSY: resource busy");
  assert.equal(errorAt(failed, "history"), "Save 11 was not deleted: EBUSY: resource busy");
  assert.equal(errorAt(failed, "sessions"), null);
  assert.equal(errorAt(finish(begin(IDLE, "delete", [9, 10]), "delete", [9, 10], "x"), "history"), "Saves 9, 10 were not deleted: x");
  assert.equal(errorAt(press(failed, "delete", [10]).act, "history"), null);
  assert.equal(errorAt(press(failed, "refresh", [null]).act, "history"), "Save 11 was not deleted: EBUSY: resource busy");
  assert.equal(errorAt(dismiss(failed, "history"), "history"), null);
  assert.equal(errorAt(finish(begin(IDLE, "delete", [11]), "delete", [11]), "history"), null);
});

test("activity: each action's failure reads in its own tab", () => {
  const fail = (action, targets) => finish(begin(IDLE, action, targets), action, targets, "boom");
  assert.equal(errorAt(fail("remove", ["k1"]), "sessions"), "The session is still in the save: boom");
  assert.equal(errorAt(fail("remove", ["k1", "k2"]), "sessions"), "2 sessions are still in the save: boom");
  assert.equal(errorAt(fail("refresh", [null]), "sessions"), "The refresh did not finish: boom");
  assert.equal(errorAt(fail("save", [null]), "sessions"), "The save did not run: boom");
  assert.equal(errorAt(fail("settings", [1]), "settings"), "The settings change did not finish: boom");
  assert.equal(errorAt(fail("load", [null]), "sessions"), "Could not read the save, the history or the settings: boom");
});

test("activity: a press starts its free targets and clears its tab's error; an ignored press changes nothing", () => {
  const p = press(IDLE, "delete", [10, 11]);
  assert.deepEqual(p.go, [10, 11]);
  assert.equal(busyWith(p.act, "delete", 10), true);
  const again = press(p.act, "delete", [11]);
  assert.deepEqual(again.go, []);
  assert.equal(again.act, p.act);
  const failedBusy = finish(press(begin(IDLE, "delete", [11]), "delete", [10]).act, "delete", [10], "x");
  assert.equal(press(failedBusy, "delete", [11]).act, failedBusy);
  assert.equal(errorAt(press(failedBusy, "delete", [11]).act, "history"), "Save 10 was not deleted: x");
});

test("activity: a save an action starts after it does not clear that action's error", () => {
  const removeFailed = finish(press(IDLE, "remove", ["k1"]).act, "remove", ["k1"], "boom");
  const saving = begin(removeFailed, "save", ["remove-1"]);
  assert.equal(anyBusy(saving, "save"), true);
  assert.equal(errorAt(saving, "sessions"), "The session is still in the save: boom");
  assert.equal(errorAt(press(removeFailed, "save", [null]).act, "sessions"), null);
  const both = finish(saving, "save", ["remove-1"], "EACCES");
  assert.equal(errorAt(both, "sessions"), "The session is still in the save: boom. The save did not run: EACCES");
});

test("activity: an Open's check keeps no error and clears none, as the rows say why when nothing opens", () => {
  const failed = finish(press(IDLE, "remove", ["k1"]).act, "remove", ["k1"], "boom");
  const checking = press(failed, "check", ["k2"]);
  assert.deepEqual(checking.go, ["k2"]);
  assert.equal(errorAt(checking.act, "sessions"), "The session is still in the save: boom");
  const ended = finish(checking.act, "check", ["k2"], "core gone");
  assert.equal(busyWith(ended, "check", "k2"), false);
  assert.equal(errorAt(ended, "sessions"), "The session is still in the save: boom");
  assert.equal(errorAt(finish(press(IDLE, "check", ["k2"]).act, "check", ["k2"], "core gone"), "sessions"), null);
});

test("activity: a press that does not clear (the refresh unfolding runs) keeps the error and is still ignored while busy", () => {
  const failed = finish(press(IDLE, "remove", ["k1"]).act, "remove", ["k1"], "boom");
  const unfold = press(failed, "refresh", [null], { clear: false });
  assert.deepEqual(unfold.go, [null]);
  assert.equal(busyWith(unfold.act, "refresh"), true);
  assert.equal(errorAt(unfold.act, "sessions"), "The session is still in the save: boom");
  assert.deepEqual(press(unfold.act, "refresh", [null], { clear: false }).go, []);
  assert.equal(errorAt(press(failed, "refresh", [null]).act, "sessions"), null);
});

test("parseSettings reads autoSave: on unless the file says false", () => {
  assert.equal(DEFAULT_SETTINGS.autoSave, true);
  assert.equal(parseSettings('{"autoSave": false}').autoSave, false);
  assert.equal(parseSettings('{"autoSave": true}').autoSave, true);
  assert.equal(parseSettings('{"autoSave": "no"}').autoSave, true);
  assert.equal(parseSettings('{"autoSave": false, "saveEveryMinutes": 4}').saveEveryMinutes, 4);
});

test("chipState with auto save off says so in grey, never turns red for age, and keeps an open, a failed save, a save running and what can be restored above it", () => {
  const s = (o) => ({ restorable: 0, working: 0, saved: 0, stalled: false, sig: "", ...o });
  const off = (summary, opening = null, since = 0, saving = false) => chipState(summary, opening, since, STALE_MS, saving, false);
  assert.deepEqual(off(s({ saved: 18 })), { label: "Auto save off", dot: "dim" });
  assert.deepEqual(off(null), { label: "Auto save off", dot: "dim" });
  assert.deepEqual(off(s({ saved: 18 }), null, STALE_MS * 100), { label: "Auto save off", dot: "dim" });
  assert.deepEqual(off(null, null, STALE_MS * 100), { label: "Auto save off", dot: "dim" });
  assert.deepEqual(off(s({ saved: 2, restorable: 3 })), { label: "3 to restore", dot: "amber" });
  assert.deepEqual(off(s({ stalled: true })), { label: "Save stalled", dot: "red" });
  assert.deepEqual(off(s({ saved: 18 }), null, 0, true), { label: "Saving", dot: "green", spin: true });
  assert.deepEqual(off(s({ saved: 18 }), { opened: 1, total: 2 }), { label: "Opening 1/2", dot: "green" });
  assert.deepEqual(chipState(s({ saved: 18 }), null, STALE_MS + 1, STALE_MS, false, true), { label: "Save stalled", dot: "red" });
});

test("digitsOnly keeps the digits a number field was given and drops everything else", () => {
  assert.equal(digitsOnly("12"), "12");
  assert.equal(digitsOnly("1a2b"), "12");
  assert.equal(digitsOnly("-5"), "5");
  assert.equal(digitsOnly("3.7"), "37");
  assert.equal(digitsOnly(" 4 "), "4");
  assert.equal(digitsOnly("abc"), "");
  assert.equal(digitsOnly("１２"), "");
});

test("clampWhole keeps a whole number inside the bounds, and reads text that is no number as null", () => {
  assert.equal(clampWhole("0", 1, 1440), 1);
  assert.equal(clampWhole("2000", 1, 1440), 1440);
  assert.equal(clampWhole("30", 1, 1440), 30);
  assert.equal(clampWhole(7, 1, 50), 7);
  assert.equal(clampWhole("", 1, 50), null);
  assert.equal(clampWhole("x", 1, 50), null);
});

test("the settings' bounds: an interval of 1 to 1440 minutes, a history of 1 to 50 saves", () => {
  assert.deepEqual(SETTING_BOUNDS, { saveEveryMinutes: { min: 1, max: 1440 }, historyLimit: { min: 1, max: 50 } });
});

test("a settings file holding a history limit over the Settings tab's maximum reads as the maximum", () => {
  assert.equal(parseSettings(JSON.stringify({ historyLimit: 80 })).historyLimit, 50);
  assert.equal(parseSettings(JSON.stringify({ historyLimit: 50 })).historyLimit, 50);
  assert.equal(parseSettings(JSON.stringify({ historyLimit: 7 })).historyLimit, 7);
  assert.equal(parseSettings(JSON.stringify({ historyLimit: null })).historyLimit, null);
});

test("ifUnchanged takes the new value only while the one shown is still the one seen", () => {
  const seen = { saveEveryMinutes: 5 }, back = { saveEveryMinutes: 10 }, later = { saveEveryMinutes: 7 };
  assert.equal(ifUnchanged(seen, seen, back), back);
  assert.equal(ifUnchanged(later, seen, back), later);
  const empty = parseHistory(null), arrived = parseHistory('{"version":1,"saves":[{"id":2,"at":2,"entries":[]},{"id":1,"at":1,"entries":[]}]}');
  const read = parseHistory('{"version":1,"saves":[{"id":1,"at":1,"entries":[]}]}');
  assert.equal(ifUnchanged(empty, empty, read), read);
  assert.deepEqual(ifUnchanged(arrived, empty, read).saves.map((s) => s.id), [2, 1]);
});

test("afterDelete drops the deleted saves from the ticks and folds the unfolded one, leaving the rest", () => {
  assert.deepEqual(afterDelete({ picked: [3, 2, 1], expanded: 2 }, [2, 1]), { picked: [3], expanded: null });
  assert.deepEqual(afterDelete({ picked: [3, 2], expanded: 3 }, [2]), { picked: [3], expanded: 3 });
  assert.deepEqual(afterDelete({ picked: [], expanded: null }, [5]), { picked: [], expanded: null });
});

test("withLook applies a look at least as new as the one shown, and drops an older one whole", () => {
  const opened = new Map([["s1", { at: "opened", address: "t2", since: 50 }]]);
  const shown = { states: opened, running: new Map([["s1", "t2"]]), lookAt: 100 };
  const older = withLook(shown, { at: 90, running: new Map() });
  assert.equal(older, shown);
  assert.equal(older.states.get("s1")?.at, "opened");
  const newer = withLook(shown, { at: 120, running: new Map() });
  assert.equal(newer.lookAt, 120);
  assert.equal(newer.running.size, 0);
  assert.equal(newer.states.has("s1"), false);
  const same = withLook(shown, { at: 100, running: new Map() });
  assert.equal(same.lookAt, 100);
  assert.equal(same.running.size, 0);
  const first = withLook({ states: opened, running: null, lookAt: null }, { at: 10, running: new Map([["s1", "t2"]]) });
  assert.equal(first.lookAt, 10);
  assert.equal(first.states.get("s1")?.at, "opened");
});

test("arrive takes a write unless the field shows a later write, whatever reads came between", () => {
  const read5 = arrive({}, "history", 5, "read");
  assert.equal(read5.take, true);
  const write3 = arrive(read5.turns, "history", 3, "write");
  assert.equal(write3.take, true);
  assert.deepEqual(write3.turns.history, { write: 3, read: 5 });
  const write2 = arrive(write3.turns, "history", 2, "write");
  assert.equal(write2.take, false);
  assert.equal(write2.turns, write3.turns);
  assert.equal(arrive(write3.turns, "history", 4, "write").take, true);
});

test("arrive takes a read only when it started after the field's last write and its last read", () => {
  const pressed = arrive({}, "settings", 4, "write").turns;
  const before = arrive(pressed, "settings", 3, "read");
  assert.equal(before.take, false);
  assert.equal(before.turns, pressed);
  const after = arrive(pressed, "settings", 6, "read");
  assert.equal(after.take, true);
  assert.deepEqual(after.turns.settings, { write: 4, read: 6 });
  assert.equal(arrive(after.turns, "settings", 5, "read").take, false);
  assert.equal(arrive(after.turns, "settings", 7, "read").take, true);
});

test("arrive keeps each field's turns apart", () => {
  const removed = arrive({}, "save", 8, "write").turns;
  assert.equal(arrive(removed, "save", 7, "write").take, false);
  const history = arrive(removed, "history", 7, "write");
  assert.equal(history.take, true);
  assert.deepEqual(history.turns, { save: { write: 8, read: 0 }, history: { write: 7, read: 0 } });
});

test("deletingPicked is true while a delete of any ticked save runs, and only then", () => {
  const act = begin(IDLE, "delete", [3]);
  assert.equal(deletingPicked(act, [3, 2]), true);
  assert.equal(deletingPicked(act, [2, 1]), false);
  assert.equal(deletingPicked(IDLE, [3, 2]), false);
  assert.equal(deletingPicked(begin(IDLE, "settings", [3]), [3]), false);
  assert.equal(deletingPicked(act, []), false);
});
