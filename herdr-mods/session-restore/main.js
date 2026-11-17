// session-restore: the tab bar that keeps the save (props { part: "tabs" }) or the Sessions
// panel (any other props).
import { View } from "gpui-kit";
import { props } from "herdr";
import Tabs from "./tabs.js";
import Sessions from "./panel.js";

export default class SessionRestore extends View {
  init(p, cx) {
    this.part = (p ?? props())?.part === "tabs" ? new Tabs() : new Sessions();
    this.part.init(p, cx);
  }

  render(cx) {
    return this.part.render(cx);
  }
}
