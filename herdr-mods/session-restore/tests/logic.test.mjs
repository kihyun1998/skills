// Pure logic of session-restore: run with node --test 'herdr-mods/session-restore/tests/*.test.mjs'
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  keptFlags, nextSave, planOpen, placement, resumeArgv, shellLine, isClaude, isShell, summarize, linkParents, openable, groupsOf, chipState, openProgress, groupProgress, batchResult, startOpen, endOpen, reopenable, withMarks, settleOpen, withoutRows,
  cleanTitle, ago, entriesOf, withRunning, afterLook, panelSide,
  IDLE, begin, press, finish, free, busyWith, anyBusy, errorAt, dismiss, arrive,
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

test("linkParents marks a worker only when its parent terminal is a saved Claude", () => {
  const out = linkParents([live("c", { address: "t4" }), live("w", { address: "t5", parent: "t4" }), live("x", { address: "t6", parent: "t3n" })]);
  assert.deepEqual(out.map(e => [e.sessionId, e.parentSession]), [["c", null], ["w", "c"], ["x", null]]);
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
  assert.equal(groups[0].restorable, 3);
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


// ---- the panel's activity ----

test("cleanTitle drops what an agent puts before its title", () => {
  assert.equal(cleanTitle("✳ fix login"), "fix login");
  assert.equal(cleanTitle("[ ! ] review"), "review");
  assert.equal(cleanTitle(null), "");
});

test("activity: a target under way is busy until it ends, whether it succeeded or failed", () => {
  const a = begin(IDLE, "remove", [11, 9]);
  assert.equal(busyWith(a, "remove", 11), true);
  assert.equal(busyWith(a, "remove", 9), true);
  assert.equal(busyWith(a, "remove", 10), false);
  assert.equal(busyWith(a, "save", 11), false);
  assert.equal(busyWith(finish(a, "remove", [11, 9]), "remove", 11), false);
  assert.equal(busyWith(finish(a, "remove", [11, 9], "EBUSY"), "remove", 9), false);
  assert.equal(busyWith(finish(a, "remove", [11]), "remove", 9), true);
  assert.equal(busyWith(IDLE, "remove", 11), false);
});

test("activity: a press on a busy target is ignored, and a press on several leaves only the free ones", () => {
  const a = begin(IDLE, "remove", [11]);
  assert.deepEqual(free(a, "remove", [11]), []);
  assert.deepEqual(free(a, "remove", [10, 11, 12]), [10, 12]);
  assert.deepEqual(free(a, "save", [11]), [11]);
  assert.deepEqual(free(IDLE, "remove", ["k1", "k2"]), ["k1", "k2"]);
});

test("activity: a save runs one at a time", () => {
  const saving = begin(IDLE, "save", [null]);
  assert.deepEqual(free(saving, "save", [null]), []);
  assert.deepEqual(free(IDLE, "save", [null]), [null]);
  assert.equal(anyBusy(saving, "save"), true);
  assert.equal(anyBusy(saving, "remove"), false);
  assert.equal(anyBusy(finish(saving, "save", [null]), "save"), false);
});

test("activity: a failure keeps an error where its action lives, until the next action there or a close", () => {
  const failed = finish(begin(IDLE, "remove", ["k1"]), "remove", ["k1"], "EBUSY: resource busy");
  assert.equal(errorAt(failed, "sessions"), "The session is still in the save: EBUSY: resource busy");
  assert.equal(errorAt(press(failed, "remove", ["k2"]).act, "sessions"), null);
  assert.equal(errorAt(dismiss(failed, "sessions"), "sessions"), null);
  assert.equal(errorAt(finish(begin(IDLE, "remove", ["k1"]), "remove", ["k1"]), "sessions"), null);
});

test("activity: each action's failure reads in its own tab", () => {
  const fail = (action, targets) => finish(begin(IDLE, action, targets), action, targets, "boom");
  assert.equal(errorAt(fail("remove", ["k1"]), "sessions"), "The session is still in the save: boom");
  assert.equal(errorAt(fail("remove", ["k1", "k2"]), "sessions"), "2 sessions are still in the save: boom");
  assert.equal(errorAt(fail("save", [null]), "sessions"), "The save did not run: boom");
  assert.equal(errorAt(fail("load", [null]), "sessions"), "Could not read the save: boom");
});

test("activity: a press starts its free targets and clears its tab's error; an ignored press changes nothing", () => {
  const p = press(IDLE, "remove", ["k10", "k11"]);
  assert.deepEqual(p.go, ["k10", "k11"]);
  assert.equal(busyWith(p.act, "remove", "k10"), true);
  const again = press(p.act, "remove", ["k11"]);
  assert.deepEqual(again.go, []);
  assert.equal(again.act, p.act);
  const failedBusy = finish(press(begin(IDLE, "remove", ["k11"]), "remove", ["k10"]).act, "remove", ["k10"], "x");
  assert.equal(press(failedBusy, "remove", ["k11"]).act, failedBusy);
  assert.equal(errorAt(press(failedBusy, "remove", ["k11"]).act, "sessions"), "The session is still in the save: x");
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

test("arrive takes a result, written or read, only when it is numbered after every one the field has taken", () => {
  const read5 = arrive({}, "settings", 5);
  assert.equal(read5.take, true);
  assert.equal(read5.turns.settings, 5);
  const write3 = arrive(read5.turns, "settings", 3);
  assert.equal(write3.take, false);
  assert.equal(write3.turns, read5.turns);
  const write6 = arrive(read5.turns, "settings", 6);
  assert.equal(write6.take, true);
  assert.equal(write6.turns.settings, 6);
  assert.equal(arrive(write6.turns, "settings", 6).take, false);
  assert.equal(arrive(write6.turns, "settings", 7).take, true);
});

test("arrive keeps each field's turns apart", () => {
  const removed = arrive({}, "save", 8).turns;
  assert.equal(arrive(removed, "save", 7).take, false);
  const settings = arrive(removed, "settings", 7);
  assert.equal(settings.take, true);
  assert.deepEqual(settings.turns, { save: 8, settings: 7 });
});

// ---- the save: one file, written only by Save ----

test("nextSave is the sessions alive now and nothing else: no list is carried from an earlier save", () => {
  const save = nextSave([{ sessionId: "b", address: "t2" }, { sessionId: "b", address: "t3" }, { sessionId: "c", address: "t4" }], { now: 5 });
  assert.deepEqual(save, { version: 2, savedAt: 5, sessions: [
    { sessionId: "b", address: "t2", parentSession: null, key: "b" },
    { sessionId: "c", address: "t4", parentSession: null, key: "c" },
  ] });
  assert.deepEqual(nextSave([], { now: 6 }), { version: 2, savedAt: 6, sessions: [] });
});

test("entriesOf lists a save's sessions, and nothing for no save", () => {
  assert.deepEqual(entriesOf({ sessions: [{ key: "a" }] }), [{ key: "a" }]);
  assert.deepEqual(entriesOf(null), []);
});

test("ago says seconds under a minute, minutes under an hour, then hours", () => {
  assert.deepEqual([ago(0), ago(59_000), ago(60_000), ago(59 * 60_000), ago(60 * 60_000), ago(5 * 3_600_000)], ["0s ago", "59s ago", "1m ago", "59m ago", "1h ago", "5h ago"]);
  assert.equal(ago(-5), "0s ago");
});

test("summarize gives how many sessions the save holds, when it was made, and whether the last save failed", () => {
  assert.deepEqual(summarize({ savedAt: 10, sessions: [{}, {}] }), { saved: 2, savedAt: 10, failed: false });
  assert.deepEqual(summarize(null, { failed: true }), { saved: 0, savedAt: null, failed: true });
});

test("chipState: an open under way, then a save running, then a failed save, then no save yet, then how long ago", () => {
  const ok = { saved: 3, savedAt: 1_000, failed: false };
  const now = 1_000 + 2 * 3_600_000;
  assert.deepEqual(chipState(ok, { opening: { opened: 1, total: 4 }, saving: true, now }), { label: "Opening 1/4", dot: "green" });
  assert.deepEqual(chipState({ ...ok, failed: true }, { saving: true, now }), { label: "Saving", dot: "dim", spin: true });
  assert.deepEqual(chipState({ ...ok, failed: true }, { now }), { label: "Save failed", dot: "red" });
  assert.deepEqual(chipState(null, { now }), { label: "Not saved", dot: "dim" });
  assert.deepEqual(chipState({ saved: 0, savedAt: null, failed: false }, { now }), { label: "Not saved", dot: "dim" });
  assert.deepEqual(chipState(ok, { now }), { label: "Saved 2h ago", dot: "green" });
  assert.deepEqual(chipState(ok, { opening: { opened: 0, total: 0 }, now }), { label: "Saved 2h ago", dot: "green" });
});

test("reopenable leaves out a row this panel is opening or has opened", () => {
  const e = { key: "a", sessionId: "a" };
  assert.equal(reopenable(e, [e], new Map()), true);
  assert.equal(reopenable(e, [e], new Map([["a", { at: "opening" }]])), false);
  assert.equal(reopenable(e, [e], new Map([["a", { at: "opened" }]])), false);
  assert.equal(reopenable(e, [e], new Map([["a", { at: "failed" }]])), true);
});

test("withRunning shows each entry open where a live terminal holds its session, at that terminal, and closed otherwise", () => {
  const entries = [{ key: "a", sessionId: "a", address: "t1" }, { key: "b", sessionId: "b", address: "t2" }];
  assert.deepEqual(withRunning(entries, new Map([["a", "t9"]])), [
    { key: "a", sessionId: "a", address: "t9", live: true },
    { key: "b", sessionId: "b", address: "t2", live: false },
  ]);
});

test("afterLook drops the opened marks from before the look and keeps newer ones and every other mark", () => {
  const states = new Map([["old", { at: "opened", since: 5 }], ["new", { at: "opened", since: 20 }], ["f", { at: "failed" }], ["o", { at: "opening" }]]);
  assert.deepEqual([...afterLook(states, 10).keys()], ["new", "f", "o"]);
});

test("activity: the look at the terminals runs one at a time, and its failure reads in the panel", () => {
  assert.deepEqual(free(begin(IDLE, "look", [null]), "look", [null]), []);
  assert.equal(errorAt(finish(begin(IDLE, "look", [null]), "look", [null], "core gone"), "sessions"), "Could not check which sessions are open: core gone");
});

test("panelSide unfolds the panel below a chip pressed in the top half of the window, else above it", () => {
  assert.equal(panelSide(10, 800), "below");
  assert.equal(panelSide(399, 800), "below");
  assert.equal(panelSide(400, 800), "above");
  assert.equal(panelSide(790, 800), "above");
  assert.equal(panelSide(10, 0), "above");
});
