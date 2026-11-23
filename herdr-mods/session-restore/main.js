// session-restore: the chip, a kept Herdr window that shows how long ago the save was made. Pressed,
// it unfolds the Sessions panel (panel.js) above itself, or below it when the chip is in the top half
// of the window; pressed again, it folds it.
import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex, Popup } from "gpui-base";
import { theme, props, closeOverlay, nextCommand, checking } from "herdr";
import { chipState, panelSide } from "./logic.js";
import Sessions, { SPINNER } from "./panel.js";

/** chipState()'s dot as a theme color. */
const DOT = { green: "ansi2", amber: "ansi3", red: "ansi1", dim: "dim" };
/** The unfolded panel's size and its gap from the chip, in px. */
const PANEL_W = 380, PANEL_H = 640, GAP = 8;
/** One width for every label, so the chip's window, placed by its top left, does not move the panel. */
const CHIP_W = 156;
/** How far the pointer may move between press and release for it to count as a press, not a drag. */
const PRESS_SLOP = 4;

export default class SessionRestore extends View {
  init(p, cx) {
    this.open = false;
    this.down = null;
    this.side = "above";
    this.viewHeight = 0;
    this.overlay = (p ?? props())?.overlay ?? null;
    this.panel = new Sessions();
    this.panel.init(p, cx);
    if (checking()) return;
    // "close" closes the chip for good (its kept entry goes with it); "save" saves now.
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command === "close") {
          if (this.overlay) closeOverlay(this.overlay);
        } else if (command === "save") this.panel.saveNow(cx);
        cx.notify();
      }
    });
  }

  render(cx) {
    const t = theme();
    this.viewHeight = window.viewport_size?.()?.height ?? 0;
    const below = this.side === "below";
    const { label, dot, spin } = chipState(this.panel.summary(), { opening: this.panel.progress(), saving: this.panel.saving() });
    // A press that does not move toggles the panel; one that moves is Herdr dragging the window.
    const chip = h_flex().id("chip").w(CHIP_W).h(28).px(11).gap(7).flex_none().items_center().rounded_full()
      .bg(t.surface).border_1().border_color(t.border).shadow_md()
      .text_size(12).text_color(t.foreground).cursor_pointer().hover((s) => s.bg(t.hover))
      .on_mouse_down("left", (e) => { this.down = e.position; })
      .on_mouse_up("left", (e, cx) => {
        const d = this.down;
        this.down = null;
        if (!d || Math.hypot(e.position.x - d.x, e.position.y - d.y) > PRESS_SLOP) return;
        this.open = !this.open;
        if (this.open) this.side = panelSide(e.position.y, this.viewHeight);
        // Unfolding looks at the terminals to show which saved sessions are open now; it writes nothing.
        if (this.open && !checking()) this.panel.look(cx);
        cx.notify();
      })
      .child(spin
        ? svg(SPINNER).size(10).flex_none().text_color(t[DOT[dot]]).spin(900)
        : div().size(7).flex_none().rounded_full().bg(t[DOT[dot]]))
      .child(div().flex_1().min_w(0).truncate().child(label))
      .child(div().flex_none().text_color(t.dim).child(this.open === below ? "▴" : "▾"));
    return Popup.new("sessions-popup", chip).anchor(below ? "top_right" : "bottom_right")
      .when(this.open, (el) => el.content(v_flex().when(below, (c) => c.pt(GAP)).when(!below, (c) => c.pb(GAP))
        // Presses in the panel are the panel's, never a drag of the window.
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .child(div().w(PANEL_W).h(PANEL_H).child(this.panel.render(cx)))));
  }
}
