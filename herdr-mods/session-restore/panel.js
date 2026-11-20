// Sessions: three tabs. Sessions is the Claude sessions the save holds, grouped by space, to open
// again in place or take out of the save; History is the past saves, to look into, open from,
// delete and merge; Settings is the save interval and the history limit. The chip (main.js)
// draws it above itself when unfolded.
import { div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, theme, shared, checking, openOverlay, watchFolder, appHome } from "herdr";
import { anyBusy, batchResult, begin, busyWith, cleanTitle as clean, conductorOf, DEFAULT_SETTINGS, dismiss, endOpen, errorAt, finish, IDLE, press, entriesOf, folderChange, groupProgress, groupsOf, keepLive, liveOf, mergeDialog, openable, openProgress, overLimit, parseHistory, reopenable, settleOpen, staleAfter, startOpen, withMarks, withoutRows, withRunning } from "./logic.js";
import { deleteSaves, historyPath, lookAtTerminals, readHistory, readSettings, removeEntries, settingsPath, writeSettings } from "./save.js";
import { openSessions } from "./open.js";
import { herdrIo, readSave, saveAndShare, SHARED } from "./io.js";

/** The ring Herdr's own mods turn for something under way. */
export const SPINNER = "mods/workspace-chrome/spinner.svg";
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const PULSE = { from: 0.4, to: 1, period: 1200 };
const message = (err) => (err == null ? null : String(err?.message ?? err));

const minutes = (n) => (n === 1 ? "minute" : n + " minutes");

function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.round(s / 60);
  return m < 60 ? m + "m ago" : Math.round(m / 60) + "h ago";
}

const model = (e) => {
  const i = (e.flags ?? []).findIndex((f) => f === "--model" || f.startsWith("--model="));
  if (i < 0) return null;
  return e.flags[i].includes("=") ? e.flags[i].split("=")[1] : e.flags[i + 1] ?? null;
};

// A part of the chip's View (main.js), not a View of its own.
export default class Sessions {
  init(_props, cx) {
    this.save = null;
    this.state = new Map();
    this.batch = new Set();
    this.opens = 0;
    this.activity = IDLE;
    this.tasks = 0;
    this.hovered = null;
    this.tab = "sessions";
    this.history = parseHistory(null);
    this.settings = { ...DEFAULT_SETTINGS };
    // The last refresh: session id to address, and when it looked.
    this.running = null;
    this.lookAt = null;
    this.expanded = null;
    this.picked = [];
    this.askDelete = false;
    this.askLimit = null;
    if (checking()) return;
    // The save, history and settings on disk, until the chip's first save hands the panel them.
    this.activity = begin(this.activity, "load", [null]);
    cx.spawn((cx) => this.track(cx, "load", [null], async () => {
      const io = herdrIo(cx);
      const [save, history, settings] = await Promise.all([readSave(), readHistory(io), readSettings(io)]);
      this.save ??= save;
      this.history = history;
      this.settings = settings;
    }));
    cx.spawn(async (cx) => {
      const dir = appHome().replace(/[\\/]+$/, "") + "/data", files = [historyPath(appHome()), settingsPath(appHome())];
      for (;;) {
        let change = "reload";
        try { change = folderChange(await watchFolder(dir), dir, files); } catch { await cx.sleep(10000); }
        if (change === "skip") continue;
        if (change === "released") await cx.sleep(1000);
        const io = herdrIo(cx);
        try { this.history = await readHistory(io); } catch {}
        try { this.settings = await readSettings(io); } catch {}
        cx.notify();
      }
    });
    // Redraws every 30 s for the save's age.
    cx.timer.every(30000, (cx) => cx.notify());
  }

  /**
   * The save the chip's last save left: the one it wrote, or the last good one when it failed. The
   * opened marks it shows gone are dropped (keepLive).
   */
  saved(save, history) {
    if (history) this.history = history;
    if (!save) return;
    this.save = save;
    this.state = keepLive(this.state, liveOf(save), save.savedAt);
  }

  /**
   * Refresh: looks at which sessions live terminals hold now and shows that, saving nothing. The
   * settings are read again too, as the file may have been edited by hand.
   */
  refresh(cx, clear = true) {
    const go = this.start(cx, "refresh", [null], clear);
    if (!go.length) return;
    cx.spawn((cx) => this.track(cx, "refresh", go, async () => {
      const io = herdrIo(cx);
      try {
        const look = await lookAtTerminals(io);
        this.running = look.running;
        this.lookAt = look.at;
        this.state = keepLive(this.state, look.running, look.at);
      } finally {
        this.settings = await readSettings(io);
      }
    }));
  }

  start(cx, action, targets, clear = true) {
    const { act, go } = press(this.activity, action, targets, { clear });
    this.activity = act;
    if (go.length) cx.notify();
    return go;
  }

  markBusy(cx, action, targets) {
    this.activity = begin(this.activity, action, targets);
    cx.notify();
  }

  async track(cx, action, targets, job) {
    let result = null, error = null;
    try { result = await job(); } catch (err) { error = err; }
    this.end(cx, action, targets, error);
    return result;
  }

  end(cx, action, targets, error = null) {
    this.activity = finish(this.activity, action, targets, message(error));
    cx.notify();
  }

  /** The chip's own save, under way for the save icon and the chip like any other (main.js). */
  timedSave(on, cx) {
    if (on) this.markBusy(cx, "save", ["timer"]);
    else this.end(cx, "save", ["timer"]);
  }

  /** Which sessions are open: the last refresh when it is newer than the save, else the save. */
  liveNow() {
    return this.lookAt != null && this.lookAt > (this.save?.savedAt ?? 0) ? this.running : liveOf(this.save);
  }

  /** The save's entries, live as liveNow() has them. */
  entries() {
    const all = entriesOf(this.save);
    return this.lookAt != null && this.lookAt > (this.save?.savedAt ?? 0) ? withRunning(all, this.running) : all;
  }

  /** The open under way: { opened, total }, or null when none is. */
  progress() {
    return openProgress(this.state, this.batch);
  }

  saveNow(cx) {
    const go = this.start(cx, "save", [null]);
    if (go.length) cx.spawn((cx) => this.runSave(cx, go));
  }

  runSave(cx, targets) {
    return this.track(cx, "save", targets, async () => {
      const { save, history } = await saveAndShare(cx);
      this.saved(save, history);
    });
  }

  async saveAfter(cx, name) {
    const tag = name + "-" + ++this.tasks;
    this.markBusy(cx, "save", [tag]);
    await this.runSave(cx, [tag]);
  }

  // A history change on disk, then the history shown.
  changeHistory(cx, action, targets, change) {
    const go = this.start(cx, action, targets);
    if (!go.length) return;
    cx.spawn((cx) => this.track(cx, action, go, async () => { this.history = await change(herdrIo(cx), go); }));
  }

  setSettings(next, cx) {
    this.settings = next;
    this.askLimit = null;
    this.changeHistory(cx, "settings", [++this.tasks], (io) => writeSettings(io, next));
  }

  // Reads which sessions run, drops the opened marks that shows gone, then marks and opens. A press
  // while that read runs does nothing.
  open(entries, cx, allOf = () => this.entries()) {
    const go = this.start(cx, "check", entries.map((e) => e.key));
    if (!go.length) return;
    cx.spawn(async (cx) => {
      const io = herdrIo(cx);
      const look = await this.track(cx, "check", go, () => lookAtTerminals(io));
      if (look) this.state = keepLive(this.state, look.running, look.at);
      if (look) { this.running = look.running; this.lookAt = look.at; }
      const all = withMarks(allOf(), this.state), id = ++this.opens;
      ({ states: this.state, batch: this.batch } = startOpen(this.state, this.batch, entries, all, id));
      cx.notify();
      await openSessions(io, entries, all, (r) => {
        this.state = settleOpen(this.state, id, r, Date.now());
        cx.notify();
      }, look?.running ?? null);
      this.state = endOpen(this.state, id);
      await this.saveAfter(cx, "open");
    });
  }

  remove(keys, cx) {
    const go = this.start(cx, "remove", keys);
    if (!go.length) return;
    cx.spawn(async (cx) => {
      await this.track(cx, "remove", go, async () => {
        this.save = await removeEntries(herdrIo(cx), go);
        this.state = withoutRows(this.state, go);
      });
      await this.saveAfter(cx, "remove");
    });
  }

  spinner(t, label) {
    return div().w(12).flex_none().text_size(12).text_color(t.muted).role("progress_indicator").accessibility_label(label).frames(FRAMES, 80).child(FRAMES[0]);
  }

  banner(t, place) {
    const text = errorAt(this.activity, place);
    if (!text) return null;
    return h_flex().id("error-" + place).mx(10).mt(8).px(10).py(8).gap(8).flex_none().items_start().rounded(7).border_1().border_color(t.ansi1)
      .text_size(12).text_color(t.ansi1).role("alert")
      .child(div().flex_1().min_w(0).child(text))
      .child(div().id("error-" + place + "-close").cursor_pointer().accessibility_label("Close").child("×")
        .on_click((_e, cx) => { cx.stop_propagation(); this.activity = dismiss(this.activity, place); cx.notify(); }));
  }

  loading(t) {
    return h_flex().p(16).gap(6).text_size(12).text_color(t.dim).child(this.spinner(t, "Loading")).child("Loading");
  }

  button(t, id, label, action, primary = false) {
    return div().id(id).flex_none().px(8).h(24).flex().items_center().rounded(6).text_size(12).cursor_pointer()
      .text_color(primary ? t.accent : t.muted).hover((s) => s.bg(t.hover).text_color(primary ? t.accent : t.foreground))
      .on_click((_e, cx) => { cx.stop_propagation(); action(cx); })
      .child(label);
  }

  // Right of a row: what the restore did to it, else whether it was working.
  mark(t, e) {
    const s = this.state.get(e.key);
    if (s?.at === "opening") return div().text_size(11).text_color(t.ansi3).child("opening…");
    if (s?.at === "failed") return div().id("why-" + e.key).text_size(11).text_color(t.ansi1).tooltip(s.reason ?? "").child("failed");
    if (e.live) return div().text_size(11).text_color(t.ansi2).child("● open");
    if (this.lookAt != null) return div().text_size(11).text_color(t.dim).child("closed");
    return div().size(7).mx(3).flex_none().rounded(4).bg(e.status === "working" ? t.ansi3 : t.dim);
  }

  // A session row. In a history save (from set) there is no ×, and Open opens against that save's list.
  row(t, e, depth, all, from = null) {
    const worker = depth > 0;
    const s = this.state.get(e.key);
    const title = clean(e.title) || e.name || e.address;
    const tab = e.tabNamed ? e.tabName : e.tabName ? "tab " + e.tabName : null;
    const was = e.live ? "open" : "closed" + (e.status ? " · was " + e.status : "");
    const tag = model(e);
    const hovered = this.hovered === (from ? "h" + from + "-" : "") + e.key;
    const checkingOpen = anyBusy(this.activity, "check");
    const actions = () => {
      if (e.live || s?.at === "opened") {
        const address = s?.address ?? e.address;
        return [this.button(t, "go-" + e.key, "Go", () => run("agent.focus", { terminal: address }), true)];
      }
      const id = (from ? "h" + from + "-" : "") + e.key;
      const remove = from ? [] : [this.button(t, "rm-" + id, "×", (cx) => this.remove([e.key], cx))];
      const open = (cx) => (from ? this.open([e], cx, () => all) : this.open([e], cx));
      if (checkingOpen && openable(e, all)) return remove;
      if (worker && openable(e, all) && conductorOf(e, all)?.live) return [this.button(t, "open-" + id, "Open", open, true), ...remove];
      if (worker && openable(e, all)) return [div().px(6).text_size(11).text_color(t.dim).child("with its conductor"), ...remove];
      if (!openable(e, all)) return [div().px(6).text_size(11).text_color(t.dim).child("conductor not in the list"), ...remove];
      return [this.button(t, "open-" + id, "Open", open, true), ...remove];
    };
    const rowId = (from ? "h" + from + "-" : "") + e.key;
    const doing = busyWith(this.activity, "remove", e.key) ? "Removing" : busyWith(this.activity, "check", e.key) ? "Checking" : null;
    return h_flex().id("row-" + rowId).h(worker ? 38 : 44).pl(14 + depth * 26).pr(8).mx(6).gap(9).flex_none().items_center().rounded(7)
      .hover((st) => st.bg(t.hover))
      .on_hover((on, cx) => {
        if (on) this.hovered = rowId;
        else if (this.hovered === rowId) this.hovered = null;
        cx.notify();
      })
      .tooltip(((e.flags ?? []).join(" ") || "no flags") + " · " + (e.cwd ?? ""))
      .when(worker, (el) => el.child(div().self_start().mt(-4).ml(-14).w(9).h(19).flex_none().border_l(1.5).border_b(1.5).rounded_bl(6).border_color(t.input)))
      .child(image("icons/claude.svg").w(14).h(14).flex_none())
      .child(v_flex().flex_1().min_w(0)
        .child(h_flex().min_w(0).gap(6).items_center()
          .child(div().min_w(0).truncate().text_size(12.8).text_color(e.live ? t.muted : t.foreground).child(title))
          .when(Boolean(tag), (el) => el.child(div().flex_none().px(4).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(tag))))
        .child(div().truncate().text_size(11).text_color(t.muted).child([tab, was].filter(Boolean).join(" · "))))
      .when(Boolean(doing), (el) => el.loop("opacity", PULSE))
      .children(doing ? [this.spinner(t, doing)] : hovered && s?.at !== "opening" ? actions() : [this.mark(t, e)]);
  }

  // The Sessions tab: the save's sessions, live as the last refresh saw them.
  sessionsTab(t) {
    const summary = shared(SHARED) ?? null;
    const save = this.save, entries = this.entries();
    const now = Date.now();
    const every = this.settings.saveEveryMinutes;
    const stalled = Boolean(summary?.stalled) || (typeof save?.savedAt === "number" && now - save.savedAt > staleAfter(every));
    const restorable = entries.filter((e) => reopenable(e, entries, this.state));
    const groups = groupsOf(entries, this.state);
    const results = [...this.state.values()];
    const progress = this.progress(), busy = Boolean(progress), checkingOpen = anyBusy(this.activity, "check");
    const ended = batchResult(this.state, this.batch), opened = ended?.opened.length ?? 0, failed = ended?.failed.length ?? 0;

    const saveLine = !save
      ? div().text_color(t.dim).child("Not saved yet")
      : stalled
        ? h_flex().gap(4).child(div().text_color(t.ansi1).child("● Save stalled")).child(div().truncate().text_color(t.dim).child("· last good " + ago(now - save.savedAt)))
        : h_flex().gap(4).child(div().text_color(t.ansi2).child("●")).child(div().text_color(t.muted).child("Saved " + (save.current?.length ?? 0) + " · " + ago(now - save.savedAt)));

    const why = stalled
      ? summary?.error
        ? "The save failed: " + summary.error + ". The last good save is kept."
        : summary?.unreadable
          ? "Could not read " + summary.unreadable + " session id(s). A Claude Code update may have changed its session files. The last good save is kept."
          : summary?.unchecked
            ? "Could not look for the transcripts of " + summary.unchecked + " session(s) in ~/.claude/projects. They are saved anyway, and may have no conversation to reopen."
            : "Nothing has saved for a while. The chip saves every " + minutes(every) + " while it is open."
      : null;

    const checked = this.lookAt != null ? " · checked " + ago(now - this.lookAt) : "";
    const header = v_flex().px(14).pt(10).pb(10).flex_none().border_b(1).border_color(t.border)
      .child(h_flex().gap(4).text_size(11.5).child(saveLine).child(div().text_color(t.dim).child(checked)))
      .when(Boolean(why), (el) => el.child(div().mt(8).text_size(12).text_color(t.ansi1).child(why)))
      .when(restorable.length > 0 && !busy && !results.length, (el) => el.child(div().mt(8).text_size(12).text_color(t.ansi3)
        .child(restorable.length + (restorable.length === 1 ? " session" : " sessions") + " from before " + (restorable.length === 1 ? "is" : "are") + " closed")));

    const groupHeader = (g) => {
      const share = groupProgress(g, this.state, this.batch);
      return h_flex().id("sp-" + g.id).h(34).pt(12).pb(4).pl(14).pr(10).gap(6).flex_none().items_center().text_size(11)
        .child(div().truncate().text_size(12).text_color(t.foreground).child(g.name || "not in a space"))
        .when(g.working > 0, (el) => el.child(div().text_color(t.ansi3).child("working " + g.working)))
        .child(div().flex_1())
        .when(g.restorable > 0 && !busy && !checkingOpen, (el) => el.child(this.button(t, "open-sp-" + g.id, "Open · " + g.restorable, (cx) => this.open(g.open, cx), true)))
        .when(busy && share.opened > 0, (el) => el.child(div().text_color(t.muted).child(share.opened + "/" + share.total)));
    };

    const list = v_flex().id("sessions-list").flex_1().min_h(0).pb(8).overflow_y_scrollbar()
      .children(groups.flatMap((g) => [groupHeader(g), ...g.rows.map((r) => this.row(t, r.entry, r.depth, entries))]));

    const empty = div().p(16).text_size(12).text_color(t.dim).child(save
      ? "Nothing is saved. Claude sessions show up here at the next save, or press Save now."
      : "No sessions saved yet. Claude sessions show up here at the next save, or press Save now.");

    const footBar = () => h_flex().p(10).flex_none().border_t(1).border_color(t.border);
    const foot = checkingOpen
      ? footBar()
        .child(h_flex().id("checking").flex_1().h(32).gap(6).items_center().justify_center().rounded(7).bg(t.surface).text_color(t.dim).text_size(12.5)
          .child(this.spinner(t, "Checking which sessions run")).child("Checking"))
      : restorable.length > 0 && !busy
      ? footBar()
        .child(div().id("open-all").flex_1().h(32).flex().items_center().justify_center().rounded(7).cursor_pointer()
          .bg(t.solid).text_color(t.solid_foreground).text_size(12.5).font_semibold().hover((s) => s.opacity(0.9))
          .on_click((_e, cx) => this.open(restorable, cx)).child("Open all · " + restorable.length))
      : busy || ended
        ? h_flex().p(10).gap(8).flex_none().items_center().border_t(1).border_color(t.border).text_size(12)
          .child(div().flex_1().child(busy
            ? div().text_color(t.ansi3).child(progress.opened + "/" + progress.total + " opening…")
            : h_flex().gap(4).child(div().text_color(t.ansi2).child(opened + " opened,")).child(div().text_color(failed ? t.ansi1 : t.muted).child(failed + " failed"))))
          .when(!busy && failed > 0, (el) => el.child(this.button(t, "clear-failed", "Clear failed",
            (cx) => this.remove(ended.failed, cx))))
        : null;

    const loading = !save && anyBusy(this.activity, "load"), banner = this.banner(t, "sessions");
    return v_flex().size_full().min_h(0)
      .when(Boolean(banner), (el) => el.child(banner))
      .child(header)
      .child(loading ? this.loading(t) : entries.length ? list : empty)
      .when(Boolean(foot), (el) => el.child(foot));
  }

  box(t, id, on, action) {
    return div().id(id).size(14).flex_none().rounded(3).border_1().border_color(on ? t.accent : t.input)
      .bg(on ? t.accent : t.background).text_color(t.background).text_size(10).flex().items_center().justify_center()
      .cursor_pointer().on_click((_e, cx) => { cx.stop_propagation(); action(cx); cx.notify(); })
      .child(on ? "✓" : "");
  }

  // The History tab: past saves, newest first; one opens to its sessions, ticked ones delete or merge together.
  historyTab(t) {
    const saves = this.history.saves, now = Date.now(), live = this.liveNow();
    const what = (sv, i) => {
      if (sv.from) return "merged " + sv.from.join(" + ");
      const prev = saves[i + 1];
      if (!prev) return null;
      const a = new Set(prev.entries.map((e) => e.sessionId)), b = new Set(sv.entries.map((e) => e.sessionId));
      return "+" + [...b].filter((k) => !a.has(k)).length + " −" + [...a].filter((k) => !b.has(k)).length;
    };
    const rows = saves.flatMap((sv, i) => {
      const open = this.expanded === sv.id, deleting = busyWith(this.activity, "delete", sv.id);
      const head = h_flex().id("save-" + sv.id).h(42).px(10).mx(6).gap(8).flex_none().items_center().rounded(7).cursor_pointer()
        .when(open, (el) => el.bg(t.hover)).hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => { this.expanded = open ? null : sv.id; cx.notify(); })
        .child(this.box(t, "pick-" + sv.id, this.picked.includes(sv.id), () => {
          this.picked = this.picked.includes(sv.id) ? this.picked.filter((p) => p !== sv.id) : [...this.picked, sv.id];
          this.askDelete = false;
        }))
        .child(v_flex().flex_1().min_w(0)
          .child(div().text_size(12.8).child("save " + sv.id + (i === 0 ? " · latest" : "")))
          .child(div().truncate().text_size(11).text_color(t.dim)
            .child([ago(now - sv.at), sv.entries.length + (sv.entries.length === 1 ? " session" : " sessions"), what(sv, i)].filter(Boolean).join(" · "))))
        .when(deleting, (el) => el.loop("opacity", PULSE))
        .children(deleting ? [this.spinner(t, "Deleting save " + sv.id)] : [
          div().text_color(t.dim).child(open ? "▾" : "▸"),
          this.button(t, "del-" + sv.id, "×", (cx) => {
            this.picked = this.picked.filter((p) => p !== sv.id);
            if (this.expanded === sv.id) this.expanded = null;
            this.changeHistory(cx, "delete", [sv.id], (io, ids) => deleteSaves(io, ids));
          }),
        ]);
      if (!open) return [head];
      const all = withRunning(sv.entries.map((e) => ({ ...e, key: e.key ?? e.sessionId })), live);
      const marked = withMarks(all, this.state);
      return [head, ...groupsOf(marked, this.state).flatMap((g) => g.rows.map((r) => div().pl(14).child(this.row(t, r.entry, r.depth, marked, sv.id))))];
    });
    const empty = div().p(16).text_size(12).text_color(t.dim)
      .child("No saves yet. A save is kept here each time the list of open sessions changes.");
    const picked = this.picked.filter((id) => saves.some((s) => s.id === id)), n = picked.length;
    const allOn = n > 0 && n === saves.length;
    const selectAll = h_flex().id("pick-all").gap(8).items_center().cursor_pointer()
      .on_click((_e, cx) => { this.picked = allOn ? [] : saves.map((s) => s.id); this.askDelete = false; cx.notify(); })
      .child(div().size(14).flex_none().rounded(3).border_1().border_color(n ? t.accent : t.input).bg(n ? t.accent : t.background)
        .text_color(t.background).text_size(10).flex().items_center().justify_center().child(allOn ? "✓" : n ? "–" : ""))
      .child(div().text_size(11.5).text_color(t.muted).child(n ? n + " selected" : "Select all"));
    const foot = this.askDelete && n
      ? h_flex().p(10).gap(8).flex_none().items_center().border_t(1).border_color(t.border)
        .child(div().flex_1().text_size(12).child("Delete " + n + (n === 1 ? " save?" : " saves?")))
        .child(this.button(t, "delete-yes", "Delete", (cx) => {
          const ids = picked;
          this.picked = [];
          this.askDelete = false;
          if (ids.includes(this.expanded)) this.expanded = null;
          this.changeHistory(cx, "delete", ids, (io, go) => deleteSaves(io, go));
        }, true))
        .child(this.button(t, "delete-no", "Cancel", () => { this.askDelete = false; }))
      : h_flex().p(10).gap(6).flex_none().items_center().border_t(1).border_color(t.border)
        .child(selectAll)
        .child(div().flex_1())
        .when(n > 0, (el) => el.child(this.button(t, "pick-clear", "Clear", () => { this.picked = []; })))
        .when(n > 0, (el) => el.child(this.button(t, "delete-picked", "Delete · " + n, () => { this.askDelete = true; })))
        .when(n > 1, (el) => el.child(this.button(t, "merge", "Merge · " + n, () => this.openMerge(picked), true)));
    const banner = this.banner(t, "history");
    return v_flex().size_full().min_h(0)
      .when(Boolean(banner), (el) => el.child(banner))
      .child(!saves.length && anyBusy(this.activity, "load") ? div().flex_1().child(this.loading(t)) : saves.length ? v_flex().id("history-list").flex_1().min_h(0).pt(6).pb(8).overflow_y_scrollbar().children(rows) : div().flex_1().child(empty))
      .when(saves.length > 0, (el) => el.child(foot));
  }

  // The merge opens in a dialog of its own (merge.js).
  openMerge(ids) {
    openOverlay(mergeDialog(ids));
  }

  stepper(t, id, value, set) {
    return h_flex().gap(4).items_center()
      .child(this.button(t, id + "-minus", "−", (cx) => set(value - 1, cx)))
      .child(div().w(40).h(24).flex().items_center().justify_center().rounded(6).border_1().border_color(t.border).text_size(12.5).child(String(value)))
      .child(this.button(t, id + "-plus", "+", (cx) => set(value + 1, cx)));
  }

  chips(t, id, values, current, label, set) {
    return h_flex().gap(4).children(values.map((n) =>
      div().id(id + "-" + n).px(8).h(22).flex().items_center().rounded_full().border_1().cursor_pointer().text_size(11.5)
        .border_color(current === n ? t.accent : t.border).text_color(current === n ? t.accent : t.muted)
        .on_click((_e, cx) => set(n, cx)).child(label(n))));
  }

  // The Settings tab: the save interval in minutes and how many saves the history keeps.
  settingsTab(t) {
    const s = this.settings, count = this.history.saves.length;
    const every = (n, cx) => this.setSettings({ ...s, saveEveryMinutes: Math.max(1, Math.min(1440, n)) }, cx);
    // A lower limit that would drop saves asks first.
    const limit = (n, cx) => {
      const next = { ...s, historyLimit: n == null ? null : Math.max(1, n) };
      if (overLimit(this.history, next.historyLimit) > 0) { this.askLimit = next; cx.notify(); return; }
      this.setSettings(next, cx);
    };
    const ask = this.askLimit;
    const section = (title) => div().text_size(12.5).font_semibold().child(title);
    const banner = this.banner(t, "settings");
    return v_flex().size_full().min_h(0)
      .when(Boolean(banner), (el) => el.child(banner))
      .child(v_flex().id("settings").flex_1().min_h(0).p(14).gap(10).overflow_y_scrollbar()
      .child(section("Auto save"))
      .child(h_flex().gap(10).items_center()
        .child(div().text_size(12.5).text_color(t.muted).child("Every"))
        .child(this.stepper(t, "every", s.saveEveryMinutes, every))
        .child(div().text_size(12).text_color(t.muted).child("min")))
      .child(this.chips(t, "every-p", [5, 10, 15, 30, 60], s.saveEveryMinutes, (n) => n + "m", every))
      .child(div().text_size(11.5).text_color(t.dim).child("A save goes into History only when the list of open sessions changed. Refresh never saves."))
      .child(div().h(1).mt(4).mb(4).bg(t.border))
      .child(section("History"))
      .child(h_flex().gap(10).items_center()
        .child(div().text_size(12.5).text_color(t.muted).child("Keep"))
        .when(s.historyLimit != null, (el) => el.child(this.stepper(t, "limit", s.historyLimit, limit)).child(div().text_size(12).text_color(t.muted).child("saves")))
        .when(s.historyLimit == null, (el) => el.child(div().text_size(12.5).child("every save")))
        .child(div().flex_1())
        .child(this.button(t, "limit-toggle", s.historyLimit == null ? "Set a limit" : "No limit",
          (cx) => limit(s.historyLimit == null ? DEFAULT_SETTINGS.historyLimit : null, cx))))
      .child(div().text_size(11.5).text_color(t.dim).child(count + (count === 1 ? " save" : " saves") + " now"))
      .when(Boolean(ask), (el) => el.child(v_flex().mt(4).p(10).gap(8).rounded(7).border_1().border_color(t.ansi3)
        .child(div().text_size(12.5).child("Keep only the newest " + ask.historyLimit + " saves?"))
        .child(div().text_size(11.5).text_color(t.muted).child(overLimit(this.history, ask.historyLimit) + " older saves will be deleted."))
        .child(h_flex().gap(6)
          .child(this.button(t, "limit-yes", "Keep the newest " + ask.historyLimit, (cx) => this.setSettings(ask, cx), true))
          .child(this.button(t, "limit-no", "Cancel", () => { this.askLimit = null; })))))
      .child(div().mt(6).text_size(11).text_color(t.dim).child("Stored in ~/.config/herdr-app/data/session-restore.settings.json")));
  }

  render(cx) {
    const t = theme();
    const tab = (id, label) => div().id("tab-" + id).px(10).h(30).flex().items_center().cursor_pointer().text_size(12.5)
      .border_b(2).border_color(this.tab === id ? t.accent : t.background).text_color(this.tab === id ? t.foreground : t.muted)
      .on_click((_e, cx) => { this.tab = id; cx.notify(); }).child(label);
    const icon = (id, tip, action, file, doing) => div().id(id).p(4).rounded(5).cursor_pointer().text_color(doing ? t.foreground : t.muted)
      .hover((s) => s.bg(t.hover).text_color(t.foreground)).tooltip(tip).on_click((_e, cx) => action(cx))
      .when(Boolean(doing), (el) => el.role("progress_indicator").accessibility_label(doing))
      .child(doing ? svg(SPINNER).size(14).spin(900) : svg(file).size(14));
    const bar = h_flex().px(6).pt(6).flex_none().items_center().border_b(1).border_color(t.border)
      .child(tab("sessions", "Sessions")).child(tab("history", "History · " + this.history.saves.length)).child(tab("settings", "Settings"))
      .child(div().flex_1())
      .child(icon("refresh", "Refresh: show which sessions are open now (saves nothing)", (cx) => this.refresh(cx), "mods/session-restore/refresh.svg",
        anyBusy(this.activity, "refresh") && "Refreshing"))
      .child(icon("save-now", "Save now", (cx) => this.saveNow(cx), "mods/session-restore/save.svg", anyBusy(this.activity, "save") && "Saving"));
    const body = this.tab === "history" ? this.historyTab(t) : this.tab === "settings" ? this.settingsTab(t) : this.sessionsTab(t);
    return v_flex().id("sessions").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border)
      .text_color(t.foreground).text_size(13)
      .child(bar)
      .child(div().flex_1().min_h(0).child(body));
  }
}
