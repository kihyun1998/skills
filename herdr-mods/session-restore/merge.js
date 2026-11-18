// The merge dialog: the sessions of the saves ticked in History, each once and grouped by space,
// ticked in or out; Make adds them to the history as a new save. The chip's panel opens it as this
// mod with props { view: "merge", ids }.
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme, closeOverlay, checking } from "herdr";
import { cleanTitle, mergeSessions } from "./logic.js";
import { lookAtTerminals, mergeSaves, readHistory } from "./save.js";
import { herdrIo } from "./io.js";

export default class MergeDialog {
  init({ overlay = null, ids = [] } = {}, cx) {
    this.overlay = overlay;
    this.ids = ids;
    this.saves = null;
    this.rows = [];
    this.on = new Set();
    this.running = new Map();
    this.error = null;
    this.making = false;
    if (checking()) return;
    cx.spawn(async (cx) => {
      const io = herdrIo(cx);
      try {
        const history = await readHistory(io);
        this.saves = history.saves.filter((s) => ids.includes(s.id));
        this.rows = mergeSessions(this.saves);
        this.on = new Set(this.rows.map((r) => r.entry.sessionId));
      } catch (err) {
        this.error = String(err?.message ?? err);
      }
      cx.notify();
      try { this.running = (await lookAtTerminals(io)).running; } catch {}
      cx.notify();
    });
  }

  close() { if (this.overlay) closeOverlay(this.overlay); }

  make(cx) {
    if (this.making || !this.on.size) return;
    this.making = true;
    const keep = [...this.on];
    cx.spawn(async (cx) => {
      try {
        await mergeSaves(herdrIo(cx), this.ids, keep);
        this.close();
      } catch (err) {
        this.error = String(err?.message ?? err);
        this.making = false;
      }
      cx.notify();
    });
  }

  btn(t, id, label, action) {
    return div().id(id).flex_none().px(10).h(28).flex().items_center().rounded(6).text_size(12.5).cursor_pointer()
      .text_color(t.muted).hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => { cx.stop_propagation(); action(cx); cx.notify(); }).child(label);
  }

  // A checkbox for a list of session ids: ticked, partly ("some"), or not.
  box(t, id, ids) {
    const n = ids.filter((k) => this.on.has(k)).length, all = n > 0 && n === ids.length;
    return div().id(id).size(15).flex_none().rounded(3).border_1().border_color(n ? t.accent : t.input)
      .bg(n ? t.accent : t.background).text_color(t.background).text_size(10).flex().items_center().justify_center()
      .cursor_pointer().on_click((_e, cx) => {
        cx.stop_propagation();
        for (const k of ids) all ? this.on.delete(k) : this.on.add(k);
        cx.notify();
      })
      .child(all ? "✓" : n ? "–" : "");
  }

  render() {
    const t = theme();
    const saves = this.saves ?? [];
    const spaceOf = (e) => e.spaceName || "not in a space";
    const spaces = [...new Set(this.rows.map((r) => spaceOf(r.entry)))];
    const allIds = this.rows.map((r) => r.entry.sessionId);
    const title = h_flex().px(18).pt(14).pb(12).gap(10).flex_none().items_center().border_b(1).border_color(t.border)
      .child(div().text_size(15).font_semibold().child("Merge " + saves.length + " saves"))
      .child(div().min_w(0).truncate().text_size(12).text_color(t.dim).child(saves.map((s) => "save " + s.id).join(", ")))
      .child(div().flex_1())
      .child(this.btn(t, "close", "×", () => this.close()));
    const head = h_flex().px(18).h(40).gap(10).flex_none().items_center().border_b(1).border_color(t.border)
      .child(this.box(t, "all", allIds))
      .child(div().text_size(12.5).text_color(t.muted).child("All sessions in these saves"));
    const list = spaces.flatMap((sp) => {
      const rows = this.rows.filter((r) => spaceOf(r.entry) === sp);
      return [
        h_flex().px(18).pt(14).pb(4).gap(10).items_center()
          .child(this.box(t, "space-" + sp, rows.map((r) => r.entry.sessionId)))
          .child(div().text_size(13).font_semibold().child(sp))
          .child(div().text_size(11.5).text_color(t.dim).child(rows.length + (rows.length === 1 ? " session" : " sessions"))),
        ...rows.map(({ entry: e, in: holders }) => {
          const id = e.sessionId, on = this.on.has(id);
          return h_flex().id("s-" + id).pl(43).pr(18).h(40).gap(10).flex_none().items_center().cursor_pointer().hover((st) => st.bg(t.hover))
            .on_click((_e, cx) => { on ? this.on.delete(id) : this.on.add(id); cx.notify(); })
            .child(this.box(t, "box-" + id, [id]))
            .child(v_flex().flex_1().min_w(0)
              .child(div().truncate().text_size(13).text_color(on ? t.foreground : t.dim).child(cleanTitle(e.title) || e.name || e.address || id))
              .child(div().truncate().text_size(11).text_color(t.dim)
                .child([e.tabName ? "tab " + e.tabName : null, "in " + holders.map((h) => "save " + h).join(", ")].filter(Boolean).join(" · "))))
            .when(this.running.has(id), (el) => el.child(div().text_size(11).text_color(t.ansi2).child("● open")));
        }),
      ];
    });
    const n = this.on.size;
    const body = this.error
      ? div().flex_1().p(18).text_size(12.5).text_color(t.ansi1).child(this.error)
      : this.saves === null
        ? div().flex_1().p(18).text_size(12.5).text_color(t.dim).child("Reading the saves…")
        : saves.length < 2
          ? div().flex_1().p(18).text_size(12.5).text_color(t.dim).child("Fewer than two of these saves are still in the history.")
          : v_flex().id("merge-list").flex_1().min_h(0).pb(10).overflow_y_scrollbar().children(list);
    const foot = h_flex().px(18).pt(10).pb(10).gap(10).flex_none().items_center().border_t(1).border_color(t.border)
      .child(div().text_size(12).text_color(t.muted).child(n + " of " + this.rows.length + " sessions · the place of a session in several saves is from the newest"))
      .child(div().flex_1())
      .child(this.btn(t, "cancel", "Cancel", () => this.close()))
      .child(div().id("make").px(16).h(32).flex().items_center().rounded(7).text_size(12.5).font_semibold()
        .when(n > 0 && saves.length > 1 && !this.making, (el) => el.cursor_pointer().bg(t.solid).text_color(t.solid_foreground).hover((s) => s.opacity(0.9))
          .on_click((_e, cx) => this.make(cx)))
        .when(!(n > 0 && saves.length > 1) || this.making, (el) => el.bg(t.surface).text_color(t.dim))
        .child(this.making ? "Making…" : "Make a new save · " + n));
    return v_flex().id("merge").size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(13)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(title)
      .when(saves.length > 1 && !this.error, (el) => el.child(head))
      .child(body)
      .child(foot);
  }
}
