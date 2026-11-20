import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const skip = !process.env.TLA2TOOLS && "set TLA2TOOLS to the path of tla2tools.jar to run TLC";

test("an existing empty --out folder gets the chart and the report", { skip, timeout: 60_000 }, () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-out-"));
  try {
    const out = path.join(work, "out");
    fs.mkdirSync(out);
    const r = spawnSync(
      process.execPath,
      [
        ...process.execArgv,
        path.join(here, "../statechart.ts"),
        path.join(here, "corpus", "DieHard", "DieHard.tla"),
        "--out",
        out,
      ],
      { encoding: "utf8", windowsHide: true },
    );
    assert.equal(r.stderr, "");
    assert.equal(r.status, 1);
    for (const f of ["chart.mmd", "report.md", "tlc.out"]) assert.ok(fs.existsSync(path.join(out, f)), f);
    assert.deepEqual(fs.readdirSync(work), ["out"]);
  } finally {
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
