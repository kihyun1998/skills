import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const renameFails = (work: string, times: number) => {
  const hook = path.join(work, "hook.mjs");
  fs.writeFileSync(
    hook,
    `import fs from "node:fs";
import path from "node:path";
const main = /statechart\\.ts$/.test(process.argv[1] ?? "");
const { renameSync } = fs;
let calls = 0;
fs.renameSync = (from, to) => {
  if (main && path.resolve(String(to)) === ${JSON.stringify(path.join(work, "out"))} && calls++ < ${times})
    throw Object.assign(new Error(\`EPERM: operation not permitted, rename '\${from}' -> '\${to}'\`), { code: "EPERM" });
  return renameSync(from, to);
};
`,
  );
  return spawnSync(
    process.execPath,
    [
      ...process.execArgv,
      `--import=${pathToFileURL(hook).href}`,
      path.join(here, "../statechart.ts"),
      path.join(here, "corpus", "DieHard", "DieHard.tla"),
      "--out",
      path.join(work, "out"),
    ],
    { encoding: "utf8", windowsHide: true },
  );
};

const windowsSkip = skip || (process.platform !== "win32" && "the rename retry runs only on Windows");

test("a rename that stays locked leaves the empty --out folder in place", { skip: windowsSkip, timeout: 60_000 }, () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-out-"));
  try {
    const out = path.join(work, "out");
    fs.mkdirSync(out);
    const r = renameFails(work, Infinity);
    assert.equal(r.status, 2);
    assert.ok(
      r.stderr.startsWith(`${out} could not take the output, so the command wrote nothing. EPERM`),
      r.stderr,
    );
    assert.ok(fs.statSync(out).isDirectory(), "the --out folder is still there");
    assert.deepEqual(fs.readdirSync(out), []);
  } finally {
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});

test("a rename locked for a moment still writes into the empty --out folder", { skip: windowsSkip, timeout: 60_000 }, () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-out-"));
  try {
    const out = path.join(work, "out");
    fs.mkdirSync(out);
    const r = renameFails(work, 3);
    assert.equal(r.stderr, "");
    assert.equal(r.status, 1);
    for (const f of ["chart.mmd", "report.md", "tlc.out"]) assert.ok(fs.existsSync(path.join(out, f)), f);
  } finally {
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});

test("a rename locked for a moment still writes a new --out folder", { skip: windowsSkip, timeout: 60_000 }, () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-out-"));
  try {
    const out = path.join(work, "out");
    const r = renameFails(work, 3);
    assert.equal(r.stderr, "");
    assert.equal(r.status, 1);
    for (const f of ["chart.mmd", "report.md", "tlc.out"]) assert.ok(fs.existsSync(path.join(out, f)), f);
    assert.deepEqual(fs.readdirSync(work).sort(), ["hook.mjs", "out"]);
  } finally {
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});

test("a rename that stays locked writes no new --out folder", { skip: windowsSkip, timeout: 60_000 }, () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-out-"));
  try {
    const out = path.join(work, "out");
    const r = renameFails(work, Infinity);
    assert.equal(r.status, 2);
    assert.ok(
      r.stderr.startsWith(`${out} could not take the output, so the command wrote nothing. EPERM`),
      r.stderr,
    );
    assert.equal(fs.existsSync(out), false, "no --out folder");
  } finally {
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
