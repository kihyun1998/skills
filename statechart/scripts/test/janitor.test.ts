import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const found = (dir: string, name: string) =>
  fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((f) => path.join(dir, f))
    .find((f) => path.basename(f) === name);

const killWhileWriting = async (work: string, round: string, env: NodeJS.ProcessEnv = {}) => {
  const tmp = path.join(work, `tmp-${round}`);
  const parent = path.join(work, `parent-${round}`);
  fs.mkdirSync(tmp);
  fs.mkdirSync(parent);
  const child = spawn(
    process.execPath,
    [...process.execArgv, path.join(here, "../statechart.ts"), path.join(work, "Slow.tla"), "--out", path.join(parent, "out")],
    { env: { ...process.env, TMPDIR: tmp, TEMP: tmp, TMP: tmp, ...env }, stdio: "ignore", windowsHide: true },
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
  for (const end = Date.now() + 30_000; ; await sleep(100)) {
    const left = [...fs.readdirSync(tmp), ...fs.readdirSync(parent)];
    if (!left.length) break;
    assert.ok(Date.now() < end, `round ${round} left behind: ${left.join(", ")}`);
  }
};

const slowSpec = (work: string) => {
  fs.writeFileSync(path.join(work, "Slow.tla"), spec);
  fs.writeFileSync(path.join(work, "Slow.cfg"), "INIT Init\nNEXT Next\nINVARIANT Small\nCHECK_DEADLOCK FALSE\n");
};

test(
  "a command killed while TLC writes leaves nothing in the temporary folder or beside the output folder",
  { skip, timeout: 180_000 },
  async () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-janitor-"));
    try {
      slowSpec(work);
      for (let round = 0; round < 5; round++) await killWhileWriting(work, String(round));
    } finally {
      fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    }
  },
);

test(
  "a command killed while TLC writes, with nothing on PATH, still leaves nothing behind",
  {
    skip:
      skip ||
      (process.platform !== "win32" && "on POSIX the janitor's /bin/sh needs rm from PATH") ||
      (!path.isAbsolute(process.env.JAVA ?? "") && "set JAVA to the absolute path of java: the test empties PATH"),
    timeout: 120_000,
  },
  async () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-janitor-"));
    try {
      slowSpec(work);
      const empty = path.join(work, "empty");
      fs.mkdirSync(empty);
      await killWhileWriting(work, "no-path", { PATH: empty, Path: empty });
    } finally {
      fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    }
  },
);

test("a removal that fails after the check ends kills no process that took the worker's pid", { skip, timeout: 120_000 }, async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-pid-"));
  const victim = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  try {
    const hook = path.join(work, "hook.mjs");
    fs.writeFileSync(
      hook,
      `import childProcess from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
const main = /statechart\\.ts$/.test(process.argv[1] ?? "");
const { spawn } = childProcess;
childProcess.spawn = (file, list, options) => {
  const janitor = list.findIndex((a) => /janitor\\.ts$|while read/.test(a));
  if (main && janitor >= 0) list = list.map((a, i) => (i === janitor + (list[janitor].includes("while read") ? 2 : 1) ? ${JSON.stringify(String(victim.pid))} : a));
  return spawn(file, list, { ...options, windowsHide: true });
};
const { rmSync } = fs;
let failed = false;
fs.rmSync = (target, ...rest) => {
  if (main && !failed && /\\.statechart-/.test(String(target))) {
    failed = true;
    throw Object.assign(new Error("EBUSY: resource busy or locked, rmdir"), { code: "EBUSY" });
  }
  return rmSync(target, ...rest);
};
syncBuiltinESMExports();
`,
    );
    const r = spawnSync(
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
    assert.match(r.stderr, /EBUSY/, "the removal failed");
    assert.equal(r.status, 2);
    for (const end = Date.now() + 15_000; ; await sleep(100)) {
      const left = fs.readdirSync(work).filter((f) => f.includes(".statechart-"));
      if (!left.length) break;
      assert.ok(Date.now() < end, `the janitor removed nothing: ${left.join(", ")}`);
    }
    await sleep(1000);
    assert.equal(alive(victim.pid as number), true, "the process holding the pid still runs");
  } finally {
    if (alive(victim.pid as number)) process.kill(victim.pid as number, "SIGKILL");
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});

test(
  "a worker killed on its own stops the command with exit 2 and says the check was killed",
  { skip: skip || (process.platform !== "win32" && "on POSIX the signal names the kill"), timeout: 120_000 },
  async () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-killed-"));
    try {
      slowSpec(work);
      const tmp = path.join(work, "tmp");
      const parent = path.join(work, "parent");
      fs.mkdirSync(tmp);
      fs.mkdirSync(parent);
      const pidFile = path.join(work, "worker.pid");
      const hook = path.join(work, "hook.mjs");
      fs.writeFileSync(
        hook,
        `import childProcess from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
const main = /statechart\\.ts$/.test(process.argv[1] ?? "");
const { spawn } = childProcess;
childProcess.spawn = (file, list, options) => {
  const child = spawn(file, list, { ...options, windowsHide: true });
  if (main && list.some((a) => /worker\\.ts$/.test(a))) fs.writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
  return child;
};
syncBuiltinESMExports();
`,
      );
      const child = spawn(
        process.execPath,
        [
          ...process.execArgv,
          `--import=${pathToFileURL(hook).href}`,
          path.join(here, "../statechart.ts"),
          path.join(work, "Slow.tla"),
          "--out",
          path.join(parent, "out"),
        ],
        { env: { ...process.env, TMPDIR: tmp, TEMP: tmp, TMP: tmp }, stdio: ["ignore", "ignore", "pipe"], windowsHide: true },
      );
      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => (stderr += chunk));
      const closed = once(child, "close");
      for (const end = Date.now() + 30_000; ; await sleep(50)) {
        const out = found(tmp, "verdict-1.stdout");
        if (out && fs.statSync(out).size > 0) break;
        assert.ok(Date.now() < end, "TLC started writing");
      }
      execFileSync("taskkill", ["/PID", fs.readFileSync(pidFile, "utf8"), "/F"], { stdio: "ignore", windowsHide: true });
      const [status] = await closed;
      assert.equal(stderr, "Something killed the check, so the command wrote nothing.\n");
      assert.equal(status, 2);
      assert.deepEqual(fs.readdirSync(parent), []);
    } finally {
      fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    }
  },
);

test("a janitor that dies as the worker exits does not crash the command", { skip, timeout: 60_000 }, () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-epipe-"));
  try {
    const hook = path.join(work, "hook.mjs");
    fs.writeFileSync(
      hook,
      `import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
const main = /statechart\\.ts$/.test(process.argv[1] ?? "");
const { spawn } = childProcess;
let worker;
childProcess.spawn = (file, list, options) => {
  const child = spawn(file, list, { ...options, windowsHide: true });
  if (main && list.some((a) => /worker\\.ts$/.test(a))) worker = child;
  else if (main && worker)
    worker.on("exit", () =>
      process.platform === "win32"
        ? childProcess.execFileSync("taskkill", ["/PID", String(child.pid), "/F"], { stdio: "ignore", windowsHide: true })
        : process.kill(child.pid, "SIGKILL"),
    );
  return child;
};
syncBuiltinESMExports();
`,
    );
    const r = spawnSync(
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
    assert.equal(r.stderr, "");
    assert.equal(r.status, 1);
    assert.deepEqual(fs.readdirSync(work).sort(), ["hook.mjs", "out"]);
  } finally {
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
