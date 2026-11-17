// session-restore: the chip, a kept Herdr window that runs the save and shows its state. Pressed,
// it unfolds the Sessions panel (panel.js) above itself; pressed again, it folds it.
import { View, div } from "gpui-kit";
import { h_flex, v_flex, Popup } from "gpui-base";
import { theme, props, shared, closeOverlay, nextCommand, checking } from "herdr";
import { chipState } from "./logic.js";
import { startSaving } from "./save.js";
import { herdrIo, shareSummary, SHARED } from "./io.js";
import Sessions from "./panel.js";

/** chipState()'s dot as a theme color. */
const DOT = { green: "ansi2", amber: "ansi3", red: "ansi1", dim: "dim" };
/** The unfolded panel's size and its gap above the chip, in px. */
const PANEL_W = 380, PANEL_H = 640, GAP = 8;
/** How far the pointer may move between press and release for it to count as a press, not a drag. */
const PRESS_SLOP = 4;

export default class SessionRestore extends View {
  init(p, cx) {
    this.open = false;
    this.down = null;
    this.savedAt = Date.now();
    this.overlay = (p ?? props())?.overlay ?? null;
    this.panel = new Sessions();
    this.panel.init(p, cx);
    if (checking()) return;
    this.saver = startSaving(herdrIo(cx), {
      every: (ms, fn) => cx.timer.every(ms, fn),
      spawn: (cx, job) => cx.spawn(async (cx) => { await job(); cx.notify(); }),
      share: (summary) => { this.savedAt = Date.now(); shareSummary(summary); },
      unfold: () => { this.open = true; },
    }, cx);
    // "close" closes the chip for good (its kept entry goes with it); "save" saves now.
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command === "close") {
          if (this.overlay) closeOverlay(this.overlay);
        } else this.saver.command(command, cx);
        cx.notify();
      }
    });
  }

  render(cx) {
    const t = theme();
    const { label, dot } = chipState(shared(SHARED) ?? null, this.panel.progress(), Date.now() - this.savedAt);
    // A press that does not move toggles the panel; one that moves is Herdr dragging the window.
    const chip = h_flex().id("chip").h(28).px(11).gap(7).flex_none().items_center().rounded_full()
      .bg(t.surface).border_1().border_color(t.border).shadow_md()
      .text_size(12).text_color(t.foreground).cursor_pointer().hover((s) => s.bg(t.hover))
      .on_mouse_down("left", (e) => { this.down = e.position; })
      .on_mouse_up("left", (e, cx) => {
        const d = this.down;
        this.down = null;
        if (!d || Math.hypot(e.position.x - d.x, e.position.y - d.y) > PRESS_SLOP) return;
        this.open = !this.open;
        cx.notify();
      })
      .child(div().size(7).flex_none().rounded_full().bg(t[DOT[dot]]))
      .child(div().child(label))
      .child(div().text_color(t.dim).child(this.open ? "▾" : "▴"));
    return Popup.new("sessions-popup", chip).anchor("bottom_right")
      .when(this.open, (el) => el.content(v_flex().pb(GAP)
        // Presses in the panel are the panel's, never a drag of the window.
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .child(div().w(PANEL_W).h(PANEL_H).child(this.panel.render(cx)))));
  }
}
