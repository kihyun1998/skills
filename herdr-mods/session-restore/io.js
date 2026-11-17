// The herdr side of session-restore: the io save.js and open.js take, and one save with its
// summary shared.
import { hc, readTextFile, writeTextFile, spaces, run, home, appHome, shared, setShared } from "herdr";
import { summarize } from "./logic.js";
import { parseSave, saveOnce, savePath } from "./save.js";

/** The shared key the tab bar's dot and the panel read: summarize()'s fields and the last error. */
export const SHARED = "session-restore";

/** save.js's and open.js's io, from the herdr module; sleep needs the task's cx. */
export function herdrIo(cx) {
  return {
    hc: (args) => hc(args),
    read: (path) => readTextFile(path),
    write: (path, text, expected) => writeTextFile(path, text, expected),
    spaces: () => spaces(),
    run: (command, args) => run(command, args),
    sleep: (ms) => cx.sleep(ms),
    now: () => Date.now(),
    home: home(),
    appHome: appHome(),
  };
}

/** Reads the save as it is on disk. */
export async function readSave() {
  return parseSave(await readTextFile(savePath(appHome())));
}

/** Saves once, and sets the shared summary when it differs from the one there. */
export async function saveAndShare(cx) {
  let save = null, unreadable = 0, error = null;
  try {
    ({ save, unreadable } = await saveOnce(herdrIo(cx)));
  } catch (err) {
    error = String(err?.message ?? err);
    save = await readSave();
  }
  const summary = { ...summarize(save, { now: Date.now(), failed: Boolean(error) || unreadable > 0 }), unreadable, error };
  if (JSON.stringify(shared(SHARED) ?? null) !== JSON.stringify(summary)) setShared(SHARED, summary);
  return { save, summary };
}
