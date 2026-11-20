import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const skip = !process.env.TLA2TOOLS && "set TLA2TOOLS to the path of tla2tools.jar to run TLC";

const spec = `---- MODULE Slow ----
EXTENDS Naturals
VARIABLES a, b
Init == a = 0 /\\ b = 0
IncA == a < 3000 /\\ a' = a + 1 /\\ UNCHANGED b
IncB == b < 3000 /\\ b' = b + 1 /\\ UNCHANGED a
Next == IncA \\/ IncB
Small == a + b >= 0
====
`;

const found = (dir: string, name: string) =>
  fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((f) => path.join(dir, f))
    .find((f) => path.basename(f) === name);

test(
  "a command killed while TLC writes leaves nothing in the temporary folder or beside the output folder",
  { skip, timeout: 180_000 },
  async () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-janitor-"));
    try {
      fs.writeFileSync(path.join(work, "Slow.tla"), spec);
      fs.writeFileSync(
        path.join(work, "Slow.cfg"),
        "INIT Init\nNEXT Next\nINVARIANT Small\nCHECK_DEADLOCK FALSE\n",
      );
      for (let round = 0; round < 5; round++) {
        const tmp = path.join(work, `tmp-${round}`);
        const parent = path.join(work, `parent-${round}`);
        fs.mkdirSync(tmp);
        fs.mkdirSync(parent);
        const child = spawn(
          process.execPath,
          [
            ...process.execArgv,
            path.join(here, "../statechart.ts"),
            path.join(work, "Slow.tla"),
            "--out",
            path.join(parent, "out"),
          ],
          { env: { ...process.env, TMPDIR: tmp, TEMP: tmp, TMP: tmp }, stdio: "ignore", windowsHide: true },
        );
        const exited = once(child, "exit");
        try {
          for (const end = Date.now() + 30_000; ; await sleep(50)) {
            const out = found(tmp, "verdict-1.stdout");
            if (out && fs.statSync(out).size > 0) break;
            assert.ok(Date.now() < end, "TLC started writing");
          }
          await sleep(500);
        } finally {
          child.kill("SIGKILL");
          await exited;
        }
        for (const end = Date.now() + 15_000; ; await sleep(100)) {
          const left = [...fs.readdirSync(tmp), ...fs.readdirSync(parent)];
          if (!left.length) break;
          assert.ok(Date.now() < end, `round ${round} left behind: ${left.join(", ")}`);
        }
      }
    } finally {
      fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    }
  },
);
