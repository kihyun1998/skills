// The herdr side of session-restore: the io save.js and open.js take, and one save with its
// summary shared.
import { exists, readdir, readFile, writeFile } from "fs/promises";
import { hc, readTextFile, writeTextFile, spaces, run, home, appHome, shared, setShared } from "herdr";
import { parseSave, saveAndSummarize, savePath } from "./save.js";

/** The shared key the chip and the panel read: summarize()'s fields and the last error. */
export const SHARED = "session-restore";

let turns = 0;

/** The next number of the one count every save, read and change of this window takes (arrive in logic.js). */
export const nextTurn = () => ++turns;

/** save.js's and open.js's io, from the herdr module; sleep needs the task's cx. */
export function herdrIo(cx) {
  return {
    hc: (args) => hc(args),
    read: (path) => readTextFile(path),
    write: (path, text, expected) => writeTextFile(path, text, expected),
    readBytes: (path) => readFile(path),
    writeBytes: (path, bytes) => writeFile(path, bytes),
    exists: (path) => exists(path),
    list: (dir) => readdir(dir, { withFileTypes: true }),
    spaces: () => spaces(),
    run: (command, args) => run(command, args),
    sleep: (ms) => cx.sleep(ms),
    now: () => Date.now(),
    turn: nextTurn,
    home: home(),
    appHome: appHome(),
  };
}

/** Reads the save as it is on disk. */
export async function readSave() {
  return parseSave(await readTextFile(savePath(appHome())));
}

/** Sets the shared summary when it differs from the one there. */
export function shareSummary(summary) {
  if (JSON.stringify(shared(SHARED) ?? null) !== JSON.stringify(summary)) setShared(SHARED, summary);
}

/** Saves once, and shares the summary. */
export async function saveAndShare(cx) {
  const { save, turn, summary } = await saveAndSummarize(herdrIo(cx));
  shareSummary(summary);
  return { save, turn, summary };
}
