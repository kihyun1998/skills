import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { killGroup } from "../run.ts";

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

test("killGroup ends a detached process and the process it started", { timeout: 30000 }, async () => {
  const grandchild = `setInterval(() => {}, 1000)`;
  const child = spawn(
    process.execPath,
    [
      "-e",
      `const c = require("node:child_process").spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}], { stdio: "ignore", detached: process.platform === "win32", windowsHide: true });
       console.log(c.pid);
       setInterval(() => {}, 1000);`,
    ],
    { detached: true, stdio: ["ignore", "pipe", "ignore"], windowsHide: true },
  );
  let grandchildPid = 0;
  try {
    const [chunk] = await once(child.stdout, "data");
    grandchildPid = Number(String(chunk).trim());
    assert.ok(alive(child.pid as number) && alive(grandchildPid), "both run before the kill");
    await killGroup(child.pid as number);
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(alive(child.pid as number), false, "the process is gone");
    assert.equal(alive(grandchildPid), false, "the process it started is gone");
  } finally {
    for (const pid of [child.pid, grandchildPid])
      if (pid && alive(pid)) process.kill(pid, "SIGKILL");
    child.stdout.destroy();
  }
});
