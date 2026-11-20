import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { readMessages } from "../frontends/messages.ts";
import { fileLines, outputLines } from "../run.ts";

const tlc = [
  "@!@!@STARTMSG 2110:1 @!@!@",
  "Invariant Safe is violated.",
  "@!@!@ENDMSG 2110 @!@!@",
  "@!@!@STARTMSG 2186:0 @!@!@",
  "Finished in 00s at (2026-11-20 09:08:58)",
  "@!@!@ENDMSG 2186 @!@!@",
  "",
];
const lf = tlc.join("\n");
const crlf = tlc.join("\r\n");

test("a file written with CRLF line ends reads as the same lines as with LF", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-lines-"));
  try {
    const file = path.join(dir, "out");
    fs.writeFileSync(file, crlf);
    assert.deepEqual([...fileLines(file)], tlc);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("output with CRLF line ends reads as the same lines, also when a CR and its LF arrive apart", () => {
  const bytes = Buffer.from(crlf);
  for (let cut = 0; cut <= bytes.length; cut++)
    assert.deepEqual(
      [...outputLines([bytes.subarray(0, cut), bytes.subarray(cut)])],
      tlc,
      `cut at ${cut}`,
    );
});

test("TLC's messages read the same from CRLF output as from LF output", () => {
  assert.deepEqual(
    [...readMessages(outputLines([Buffer.from(crlf)]))],
    [...readMessages(outputLines([Buffer.from(lf)]))],
  );
});
