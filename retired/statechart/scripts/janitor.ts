import fs from "node:fs";
import { killGroup } from "./run.ts";

const [pid, ...dirs] = process.argv.slice(2);

let exited = false;
process.stdin.setEncoding("utf8");
process.stdin.on("data", (text: string) => {
  if (text.includes("exited")) exited = true;
});
process.stdin.on("close", async () => {
  if (!exited) await killGroup(Number(pid));
  for (const dir of dirs)
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    } catch {}
});
