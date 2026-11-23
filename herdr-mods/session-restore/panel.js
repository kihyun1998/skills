// Sessions: the Claude sessions the save holds, grouped by space, each shown open or closed as the
// terminals hold it now, to open again in place or take out of the save. The save is written only
// when Save is pressed. The chip (main.js) draws it above itself when unfolded.
import { div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, theme, checking } from "herdr";
import { afterLook, ago, anyBusy, arrive, batchResult, begin, busyWith, cleanTitle as clean, conductorOf, dismiss, endOpen, entriesOf, errorAt, finish, groupProgress, groupsOf, IDLE, openable, openProgress, press, reopenable, settleOpen, startOpen, summarize, withMarks, withoutRows, withRunning } from "./logic.js";
import { removeEntries, runningSessions, saveAndSummarize } from "./save.js";
import { openSessions } from "./open.js";
import { herdrIo, nextTurn as countTurn, readSave } from "./io.js";

/** The ring Herdr's own mods turn for something under way. */
export const SPINNER = "mods/workspace-chrome/spinner.svg";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const PULSE = { from: 0.4, to: 1, period: 1200 };
const message = (err) => (err == null ? null : String(err?.message ?? err));

const model = (e) => {
  const i = (e.flags ?? []).findIndex((f) => f === "--model" || f.startsWith("--model="));
  if (i < 0) return null;
  return e.flags[i].includes("=") ? e.flags[i].split("=")[1] : e.flags[i + 1] ?? null;
};

// A part of the chip's View (main.js), not a View of its own.
export default class Sessions {
  init(_props, cx) {
    this.save = null;
    this.lastSave = null;
    this.state = new Map();
    this.batch = new Set();
    this.opens = 0;
    this.activity = IDLE;
    this.hovered = null;
    this.copied = null;
    this.turns = {};
    // The last look at the terminals: session id to address, and when it started.
    this.running = null;
    this.lookAt = null;
    if (checking()) return;
    this.activity = begin(this.activity, "load", [null]);
    const read = this.nextTurn();
    cx.spawn((cx) => this.track(cx, "load", [null], async () => {
      const save = await readSave();
      if (this.take("save", read)) this.save = save;
    }));
    // Redraws every 30 s for the save's age.
    cx.timer.every(30000, (cx) => cx.notify());
  }

  nextTurn() {
    return countTurn();
  }

  take(field, n) {
    const { turns, take } = arrive(this.turns, field, n);
    this.turns = turns;
    return take;
  }

  /** What the chip shows of the save: the last save's summary, or the save on disk before any. */
  summary() {
    return this.lastSave ?? (this.save ? summarize(this.save) : null);
  }

  start(cx, action, targets) {
    const { act, go } = press(this.activity, action, targets);
    this.activity = act;
    if (go.length) cx.notify();
    return go;
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

  /** The save's sessions, open or closed as the last look found them, with this panel's opens over that. */
  entries() {
    const all = entriesOf(this.save);
    return withMarks(this.running ? withRunning(all, this.running) : all, this.state);
  }

  /** Whether the look at the terminals runs now. */
  looking() {
    return anyBusy(this.activity, "look");
  }

  /** Reads which sessions live terminals hold, to show each row open or closed. It writes nothing. */
  look(cx) {
    const go = this.start(cx, "look", [null]);
    if (!go.length) return;
    cx.spawn((cx) => this.track(cx, "look", go, async () => {
      const at = Date.now(), running = await runningSessions(herdrIo(cx));
      this.running = running;
      this.lookAt = at;
      this.state = afterLook(this.state, at);
    }));
  }

  /** The open under way: { opened, total }, or null when none is. */
  progress() {
    return openProgress(this.state, this.batch);
  }

  /** Whether a save runs now. */
  saving() {
    return anyBusy(this.activity, "save");
  }

  /**
   * Save: writes the Claude sessions live terminals hold now over the save. A save that fails
   * leaves the file as it was. A copy the save made of a save file that could not be read is kept
   * to show (copied) until it is closed.
   */
  saveNow(cx) {
    const go = this.start(cx, "save", [null]);
    if (!go.length) return;
    cx.spawn((cx) => this.track(cx, "save", go, async () => {
      const { save, turn, summary } = await saveAndSummarize(herdrIo(cx));
      this.lastSave = summary;
      if (summary.saveCopied) this.copied = summary.saveCopied;
      if (save && this.take("save", turn)) this.save = save;
    }));
  }

  // Marks the rows planOpen will open, then opens them; open.js reads which sessions run first and
  // does not open one already running.
  open(entries, cx) {
    const all = this.entries(), id = ++this.opens;
    ({ states: this.state, batch: this.batch } = startOpen(this.state, this.batch, entries, all, id));
    cx.notify();
    cx.spawn(async (cx) => {
      await openSessions(herdrIo(cx), entries, all, (r) => {
        this.state = settleOpen(this.state, id, r, Date.now());
        cx.notify();
      });
      this.state = endOpen(this.state, id);
      cx.notify();
    });
  }

  remove(keys, cx) {
    const go = this.start(cx, "remove", keys);
    if (!go.length) return;
    cx.spawn((cx) => this.track(cx, "remove", go, async () => {
      const { save, turn, copied } = await removeEntries(herdrIo(cx), go);
      if (copied) this.copied = copied;
      if (this.take("save", turn)) this.save = save;
      this.state = withoutRows(this.state, go);
    }));
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
      .on_click((_e, cx) => { cx.stop_propagation(); action(cx); cx.notify(); })
      .child(label);
  }

  // Right of a row: what an open did to it, else whether its session is open now.
  mark(t, e) {
    const s = this.state.get(e.key);
    if (s?.at === "opening") return div().text_size(11).text_color(t.ansi3).child("opening…");
    if (s?.at === "failed") return div().id("why-" + e.key).text_size(11).text_color(t.ansi1).tooltip(s.reason ?? "").child("failed");
    if (e.live) return div().text_size(11).text_color(t.ansi2).child("● open");
    if (this.looking()) return this.spinner(t, "Checking");
    if (this.running) return div().text_size(11).text_color(t.dim).child("closed");
    return div();
  }

  // A session row.
  row(t, e, depth, all) {
    const worker = depth > 0;
    const s = this.state.get(e.key);
    const title = clean(e.title) || e.name || e.address;
    const tab = e.tabNamed ? e.tabName : e.tabName ? "tab " + e.tabName : null;
    const was = e.status ? "was " + e.status : null;
    const tag = model(e);
    const hovered = this.hovered === e.key;
    const actions = () => {
      if (e.live || s?.at === "opened") {
        const address = s?.address ?? e.address;
        return [this.button(t, "go-" + e.key, "Go", () => run("agent.focus", { terminal: address }), true)];
      }
      const id = e.key;
      const remove = [this.button(t, "rm-" + id, "×", (cx) => this.remove([e.key], cx))];
      const open = (cx) => this.open([e], cx);
      if (worker && openable(e, all) && conductorOf(e, all)?.live) return [this.button(t, "open-" + id, "Open", open, true), ...remove];
      if (worker && openable(e, all)) return [div().px(6).text_size(11).text_color(t.dim).child("with its conductor"), ...remove];
      if (!openable(e, all)) return [div().px(6).text_size(11).text_color(t.dim).child("conductor not in the list"), ...remove];
      return [this.button(t, "open-" + id, "Open", open, true), ...remove];
    };
    const rowId = e.key;
    const doing = busyWith(this.activity, "remove", e.key) ? "Removing" : null;
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
          .child(div().min_w(0).truncate().text_size(12.8).text_color(t.foreground).child(title))
          .when(Boolean(tag), (el) => el.child(div().flex_none().px(4).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(tag))))
        .child(div().truncate().text_size(11).text_color(t.muted).child([tab, was].filter(Boolean).join(" · "))))
      .when(Boolean(doing), (el) => el.loop("opacity", PULSE))
      .children(doing ? [this.spinner(t, doing)] : hovered && s?.at !== "opening" ? actions() : [this.mark(t, e)]);
  }

  // The save's sessions.
  sessionsTab(t) {
    const summary = this.lastSave;
    const save = this.save, entries = this.entries(), looking = this.looking();
    const now = Date.now();
    const canOpen = entries.filter((e) => reopenable(e, entries, this.state));
    const groups = groupsOf(entries, this.state);
    const progress = this.progress(), busy = Boolean(progress);
    const ended = batchResult(this.state, this.batch), opened = ended?.opened.length ?? 0, failed = ended?.failed.length ?? 0;

    const saveLine = !save
      ? div().text_color(t.dim).child("Not saved yet")
      : h_flex().gap(4).child(div().text_color(t.ansi2).child("●")).child(div().text_color(t.muted).child("Saved " + save.sessions.length + (typeof save.savedAt === "number" ? " · " + ago(now - save.savedAt) : "")));

    const why = summary?.error
      ? "The save failed: " + summary.error + ". The file is as it was."
      : summary?.unreadable
        ? "Could not read " + summary.unreadable + " session id(s). A Claude Code update may have changed its session files. They are not in the save."
        : summary?.unchecked
          ? "Could not look for the transcripts of " + summary.unchecked + " session(s) in ~/.claude/projects. They are saved anyway, and may have no conversation to reopen."
          : null;

    const header = v_flex().px(14).pt(10).pb(10).flex_none().border_b(1).border_color(t.border)
      .child(h_flex().gap(4).text_size(11.5).child(saveLine))
      .when(Boolean(why), (el) => el.child(div().mt(8).text_size(12).text_color(t.ansi1).child(why)));

    const groupHeader = (g) => {
      const share = groupProgress(g, this.state, this.batch);
      return h_flex().id("sp-" + g.id).h(34).pt(12).pb(4).pl(14).pr(10).gap(6).flex_none().items_center().text_size(11)
        .child(div().truncate().text_size(12).text_color(t.foreground).child(g.name || "not in a space"))
        .when(g.working > 0, (el) => el.child(div().text_color(t.ansi3).child("working " + g.working)))
        .child(div().flex_1())
        .when(g.restorable > 0 && !busy && !looking, (el) => el.child(this.button(t, "open-sp-" + g.id, "Open · " + g.restorable, (cx) => this.open(g.open, cx), true)))
        .when(busy && share.opened > 0, (el) => el.child(div().text_color(t.muted).child(share.opened + "/" + share.total)));
    };

    const list = v_flex().id("sessions-list").flex_1().min_h(0).pb(8).overflow_y_scrollbar()
      .children(groups.flatMap((g) => [groupHeader(g), ...g.rows.map((r) => this.row(t, r.entry, r.depth, entries))]));

    const empty = div().p(16).text_size(12).text_color(t.dim).child("Nothing is saved. Save writes the Claude sessions open now.");

    const foot = looking && !busy
      ? h_flex().p(10).flex_none().border_t(1).border_color(t.border)
        .child(h_flex().id("checking").flex_1().h(32).gap(6).items_center().justify_center().rounded(7).bg(t.surface).text_color(t.dim).text_size(12.5)
          .child(this.spinner(t, "Checking which sessions are open")).child("Checking which are open"))
      : canOpen.length > 0 && !busy
      ? h_flex().p(10).flex_none().border_t(1).border_color(t.border)
        .child(div().id("open-all").flex_1().h(32).flex().items_center().justify_center().rounded(7).cursor_pointer()
          .bg(t.solid).text_color(t.solid_foreground).text_size(12.5).font_semibold().hover((s) => s.opacity(0.9))
          .on_click((_e, cx) => this.open(canOpen, cx)).child("Open all · " + canOpen.length))
      : busy || ended
        ? h_flex().p(10).gap(8).flex_none().items_center().border_t(1).border_color(t.border).text_size(12)
          .child(div().flex_1().child(busy
            ? div().text_color(t.ansi3).child(progress.opened + "/" + progress.total + " opening…")
            : h_flex().gap(4).child(div().text_color(t.ansi2).child(opened + " opened,")).child(div().text_color(failed ? t.ansi1 : t.muted).child(failed + " failed"))))
          .when(!busy && failed > 0, (el) => el.child(this.button(t, "clear-failed", "Clear failed",
            (cx) => this.remove(ended.failed, cx))))
        : null;

    const copiedNote = this.copied && h_flex().id("copied").px(10).py(8).gap(8).flex_none().items_start().border_t(1).border_color(t.border)
      .text_size(12).text_color(t.ansi3)
      .child(div().flex_1().min_w(0).child("The save file could not be read and was written anew. Its old content is kept in " + this.copied + "."))
      .child(div().id("copied-close").cursor_pointer().text_color(t.muted).accessibility_label("Close").child("×")
        .on_click((_e, cx) => { cx.stop_propagation(); this.copied = null; cx.notify(); }));

    const loading = !save && anyBusy(this.activity, "load"), banner = this.banner(t, "sessions");
    return v_flex().size_full().min_h(0)
      .when(Boolean(banner), (el) => el.child(banner))
      .child(header)
      .child(loading ? this.loading(t) : entries.length ? list : empty)
      .when(Boolean(foot), (el) => el.child(foot))
      .when(Boolean(copiedNote), (el) => el.child(copiedNote));
  }

  render(cx) {
    const t = theme();
    const doing = this.saving() && "Saving";
    const save = div().id("save-now").p(4).rounded(5).cursor_pointer().text_color(doing ? t.foreground : t.muted)
      .hover((s) => s.bg(t.hover).text_color(t.foreground)).tooltip("Save: write the Claude sessions open now over the save")
      .on_click((_e, cx) => this.saveNow(cx))
      .when(Boolean(doing), (el) => el.role("progress_indicator").accessibility_label(doing))
      .child(doing ? svg(SPINNER).size(14).spin(900) : svg("mods/session-restore/save.svg").size(14));
    const bar = h_flex().px(14).pr(8).h(36).flex_none().items_center().border_b(1).border_color(t.border)
      .child(div().text_size(12.5).font_semibold().child("Sessions"))
      .child(div().flex_1())
      .child(save);
    return v_flex().id("sessions").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border)
      .text_color(t.foreground).text_size(13)
      .child(bar)
      .child(div().flex_1().min_h(0).child(this.sessionsTab(t)));
  }
}
