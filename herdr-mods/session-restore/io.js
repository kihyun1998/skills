// The herdr side of session-restore: the io save.js and open.js take.
import { exists, readdir, readFile, writeFile } from "fs/promises";
import { hc, readTextFile, writeTextFile, spaces, run, home, appHome } from "herdr";
import { parseSave, savePath } from "./save.js";

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
