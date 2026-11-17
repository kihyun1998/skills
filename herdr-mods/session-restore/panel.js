// Sessions: the Claude sessions the save holds, grouped by space, to open again in place or
// take out of the save. A block in the panel stack beside Files and Changes.
import { div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, theme, shared, appHome, readTextFile, updates, checking } from "herdr";
import { conductorOf, entriesOf, groupsOf, openable, STALE_MS } from "./logic.js";
import { removeEntries } from "./save.js";
import { openSessions } from "./open.js";
import { herdrIo, readSave, saveAndShare, SHARED } from "./io.js";


// Same as the agents mod: drops what an agent puts before its title (a status glyph).
const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}\p{Ps}\p{Pi}]+/u, "").replace(/^\[ [!.] \] /, "").trim();

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

// main.js draws this unless props say { part: "tabs" }; the View is main.js.
export default class Sessions {
  init(_props, cx) {
    this.save = null;
    this.sig = undefined;
    this.state = new Map();
    this.hovered = null;
    this.drift = [];
    if (checking()) return;
    this.reload(cx);
    this.checkDrift(cx);
    // Redraws every 30 s for the save's age.
    cx.timer.every(30000, (cx) => cx.notify());
  }

  reload(cx) {
    cx.spawn(async (cx) => {
      this.save = await readSave();
      cx.notify();
    });
  }

  // Lists each clone in clones.json whose Herdr version is not the running one.
  checkDrift(cx) {
    cx.spawn(async (cx) => {
      const now = updates()?.app?.version;
      const drift = [];
      try {
        const clones = JSON.parse((await readTextFile(appHome() + "/mods/session-restore/clones.json")) ?? "{}");
        for (const [label, c] of Object.entries(clones)) if (now && c?.version && c.version !== now) drift.push({ label, from: c.version, now });
      } catch {}
      this.drift = drift;
      cx.notify();
    });
  }

  saveNow(cx) {
    cx.spawn(async (cx) => {
      const { save } = await saveAndShare(cx);
      if (save) this.save = save;
      cx.notify();
    });
  }

  open(entries, cx) {
    const all = entriesOf(this.save);
    for (const e of entries) this.state.set(e.key, { at: "opening" });
    cx.spawn(async (cx) => {
      await openSessions(herdrIo(cx), entries, all, (r) => {
        this.state.set(r.key, r.ok ? { at: "opened", address: r.address } : { at: "failed", reason: r.reason });
        cx.notify();
      });
      // Rows still marked opening when the open ends are cleared.
      for (const [k, s] of this.state) if (s.at === "opening") this.state.delete(k);
      const { save } = await saveAndShare(cx);
      if (save) this.save = save;
      cx.notify();
    });
    cx.notify();
  }

  remove(keys, cx) {
    cx.spawn(async (cx) => {
      try { this.save = await removeEntries(herdrIo(cx), keys); } catch {}
      for (const k of keys) this.state.delete(k);
      await saveAndShare(cx);
      cx.notify();
    });
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
    return div().size(7).mx(3).flex_none().rounded(4).bg(e.status === "working" ? t.ansi3 : t.dim);
  }

  row(t, e, depth, all) {
    const worker = depth > 0;
    const s = this.state.get(e.key);
    const title = clean(e.title) || e.name || e.address;
    const tab = e.tabNamed ? e.tabName : e.tabName ? "tab " + e.tabName : null;
    const was = e.live ? "open" : e.status ? "was " + e.status : null;
    const tag = model(e);
    const hovered = this.hovered === e.key;
    const actions = () => {
      if (e.live || s?.at === "opened") {
        const address = s?.address ?? e.address;
        return [this.button(t, "go-" + e.key, "Go", () => run("agent.focus", { terminal: address }), true)];
      }
      const remove = this.button(t, "rm-" + e.key, "×", (cx) => this.remove([e.key], cx));
      if (worker && openable(e, all) && conductorOf(e, all)?.live) return [this.button(t, "open-" + e.key, "Open", (cx) => this.open([e], cx), true), remove];
      if (worker && openable(e, all)) return [div().px(6).text_size(11).text_color(t.dim).child("with its conductor"), remove];
      if (!openable(e, all)) return [
        div().px(6).text_size(11).text_color(t.dim).child("conductor not in the list"),
        this.button(t, "rm-" + e.key, "×", (cx) => this.remove([e.key], cx)),
      ];
      return [
        this.button(t, "open-" + e.key, "Open", (cx) => this.open([e], cx), true),
        this.button(t, "rm-" + e.key, "×", (cx) => this.remove([e.key], cx)),
      ];
    };
    return h_flex().id("row-" + e.key).h(worker ? 38 : 44).pl(14 + depth * 26).pr(8).mx(6).gap(9).flex_none().items_center().rounded(7)
      .hover((st) => st.bg(t.hover))
      .on_hover((on, cx) => {
        if (on) this.hovered = e.key;
        else if (this.hovered === e.key) this.hovered = null;
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
      .children(hovered && s?.at !== "opening" ? actions() : [this.mark(t, e)]);
  }

  render(cx) {
    const t = theme();
    const summary = shared(SHARED) ?? null;
    // The tab bar saved something new: read it again.
    if (!checking() && summary?.sig !== this.sig) { this.sig = summary?.sig; this.reload(cx); }
    const save = this.save, entries = entriesOf(save);
    const now = Date.now();
    const stalled = Boolean(summary?.stalled) || (typeof save?.savedAt === "number" && now - save.savedAt > STALE_MS);
    const restorable = entries.filter((e) => !e.live && openable(e, entries) && this.state.get(e.key)?.at !== "opened");
    const groups = groupsOf(entries);
    const results = [...this.state.values()];
    const busy = results.some((s) => s.at === "opening");
    const opened = results.filter((s) => s.at === "opened").length, failed = results.filter((s) => s.at === "failed").length;

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
          : "Nothing has saved for a while. The tab bar saves every minute while the session-restore layout shows."
      : null;

    const header = v_flex().px(14).pt(12).pb(10).flex_none().border_b(1).border_color(t.border)
      .child(h_flex().gap(8).items_center()
        .child(div().font_semibold().child("Sessions"))
        .child(div().flex_1())
        .child(div().id("save-now").p(4).rounded(5).cursor_pointer().text_color(t.muted).hover((s) => s.bg(t.hover).text_color(t.foreground))
          .tooltip("Save now").on_click((_e, cx) => this.saveNow(cx)).child(svg("mods/session-restore/sessions.svg").size(14))))
      .child(div().mt(3).text_size(11.5).child(saveLine))
      .when(Boolean(why), (el) => el.child(div().mt(8).text_size(12).text_color(t.ansi1).child(why)))
      .when(restorable.length > 0 && !busy && !results.length, (el) => el.child(div().mt(8).text_size(12).text_color(t.ansi3)
        .child(restorable.length + (restorable.length === 1 ? " session" : " sessions") + " from before " + (restorable.length === 1 ? "is" : "are") + " closed")))
      .children(this.drift.map((d) => div().mt(8).text_size(11.5).text_color(t.ansi3)
        .child("Herdr " + d.now + " is newer than the " + d.label + " clone (" + d.from + "). Compare it with the shipped " + d.label + ".")));

    const groupHeader = (g) => {
      const open = g.rows.filter((r) => !r.entry.live && openable(r.entry, entries)).map((r) => r.entry);
      const done = g.rows.filter((r) => this.state.get(r.entry.key)?.at === "opened").length;
      return h_flex().id("sp-" + g.id).h(34).pt(12).pb(4).pl(14).pr(10).gap(6).flex_none().items_center().text_size(11)
        .child(div().truncate().text_size(12).text_color(t.foreground).child(g.name || "not in a space"))
        .when(g.working > 0, (el) => el.child(div().text_color(t.ansi3).child("working " + g.working)))
        .child(div().flex_1())
        .when(g.restorable > 0 && !busy, (el) => el.child(this.button(t, "open-sp-" + g.id, "Open · " + g.restorable, (cx) => this.open(open, cx), true)))
        .when(g.restorable > 0 && busy && done > 0, (el) => el.child(div().text_color(t.muted).child(done + "/" + g.restorable)));
    };

    const list = v_flex().id("sessions-list").flex_1().min_h(0).pb(8).overflow_y_scrollbar()
      .children(groups.flatMap((g) => [groupHeader(g), ...g.rows.map((r) => this.row(t, r.entry, r.depth, entries))]));

    const empty = div().p(16).text_size(12).text_color(t.dim).child(save
      ? "Nothing is saved. Claude sessions show up here within a minute of starting."
      : "No sessions saved yet. Claude sessions show up here within a minute of starting.");

    const foot = restorable.length > 0 && !busy
      ? h_flex().p(10).flex_none().border_t(1).border_color(t.border)
        .child(div().id("open-all").flex_1().h(32).flex().items_center().justify_center().rounded(7).cursor_pointer()
          .bg(t.solid).text_color(t.solid_foreground).text_size(12.5).font_semibold().hover((s) => s.opacity(0.9))
          .on_click((_e, cx) => this.open(restorable, cx)).child("Open all · " + restorable.length))
      : results.length
        ? h_flex().p(10).gap(8).flex_none().items_center().border_t(1).border_color(t.border).text_size(12)
          .child(div().flex_1().child(busy
            ? div().text_color(t.ansi3).child(opened + "/" + results.length + " opening…")
            : h_flex().gap(4).child(div().text_color(t.ansi2).child(opened + " opened,")).child(div().text_color(failed ? t.ansi1 : t.muted).child(failed + " failed"))))
          .when(!busy && failed > 0, (el) => el.child(this.button(t, "clear-failed", "Clear failed",
            (cx) => this.remove([...this.state].filter(([, s]) => s.at === "failed").map(([k]) => k), cx))))
        : null;

    return v_flex().id("sessions").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border)
      .text_color(t.foreground).text_size(13)
      .child(header)
      .child(entries.length ? list : empty)
      .when(Boolean(foot), (el) => el.child(foot));
  }
}
