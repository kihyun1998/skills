#!/usr/bin/env node
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { killGroup, messageOf } from "./run.ts";

const USAGE = `Usage: statechart SPEC.tla [--config FILE] [--view FILE] [--out DIR]

Checks SPEC.tla with TLC and draws its state graph as Mermaid. Above 500 states, the chart
draws only the paths to the rules that break, and with no rule broken there is no chart.mmd.
  --config FILE  TLC config. Default: SPEC.cfg beside the spec.
  --view FILE    A module that exports state(vars) and, if you want, step(action, from, to),
                 group(vars), colors, and title. state() returns a string for a flat chart, an
                 array for parent states, or an object for regions. Default: each state's values.
                 colors gives each group blue, orange, purple, yellow, teal, tan, or pink.
  --out DIR      Where to write report.md, chart.mmd, tlc.out, and tlc-RULE.out for each
                 property that breaks and each rule that breaks off the chart. The folder must
                 be new or empty. Default: SPEC-chart.
Exit code: TLC's own on the config as written: 0 when every rule holds, 1 when a rule breaks,
and 2 when TLC stops with an error, something kills the check, or the command cannot run. 130 or
143 when SIGINT or SIGTERM stops the check. Only exits 0 and 1 write output.`;

let stop: NodeJS.Signals | undefined;
const stopped = new Promise<void>((resolve) => {
  for (const name of ["SIGINT", "SIGTERM"] as const)
    process.on(name, () => {
      stop ??= name;
      resolve();
    });
});

let flags;
let specFile;
try {
  const args = parseArgs({
    allowPositionals: true,
    options: { config: { type: "string" }, view: { type: "string" }, out: { type: "string" } },
  });
  flags = args.values;
  [specFile] = args.positionals;
  if (args.positionals.length !== 1) throw new Error("Give one SPEC.tla.");
} catch (error) {
  console.error(`${messageOf(error)}\n\n${USAGE}`);
  process.exit(2);
}

const codeOf = (error: unknown) =>
  error instanceof Error && "code" in error ? error.code : undefined;

try {
  const configFile = flags.config ?? specFile.replace(/\.tla$/, ".cfg");
  if (!fs.existsSync(configFile))
    throw new Error(`Cannot find the TLC config ${configFile}. Pass --config FILE.`);
  const out = flags.out ?? specFile.replace(/\.tla$/, "-chart");
  let entries: string[] = [];
  let dest: string;
  try {
    entries = fs.readdirSync(out);
    dest = fs.realpathSync(out);
  } catch (error) {
    if (codeOf(error) !== "ENOENT")
      throw new Error(
        `${out} cannot be the output folder. ${messageOf(error)}. Pass --out with a new folder.`,
        { cause: error },
      );
    if (fs.lstatSync(out, { throwIfNoEntry: false }))
      throw new Error(
        `${out} cannot be the output folder. It is a broken link. Pass --out with a new folder.`,
        { cause: error },
      );
    dest = path.resolve(out);
  }
  if (entries.length)
    throw new Error(
      `${out} is not empty. It has ${entries.sort()[0]}. The command writes only to a new or empty folder. Pass --out with a new folder.`,
    );

  let base = path.dirname(dest);
  while (!fs.existsSync(base)) base = path.dirname(base);
  const stage = fs.mkdtempSync(path.join(base, `.${path.basename(dest)}.statechart-`));
  const done = path.join(stage, "done");
  let tmp: string | undefined;
  let janitor: ChildProcess | undefined;
  let exitCode: number;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-"));
    const runtime = process.versions.deno
      ? [
          "run",
          "--quiet",
          "--no-prompt",
          "--allow-read",
          "--allow-write",
          "--allow-run",
          "--allow-env",
        ]
      : process.execArgv;
    const worker = spawn(
      process.execPath,
      [
        ...runtime,
        path.join(import.meta.dirname, "worker.ts"),
        stage,
        specFile,
        configFile,
        ...(flags.view ? [flags.view] : []),
      ],
      {
        detached: true,
        stdio: ["ignore", "inherit", "inherit"],
        windowsHide: true,
        env: {
          ...process.env,
          TMPDIR: tmp,
          ...(process.platform === "win32" && { TEMP: tmp, TMP: tmp }),
        },
      },
    );
    janitor =
      process.platform === "win32"
        ? spawn(
            process.execPath,
            [
              ...runtime,
              path.join(import.meta.dirname, "janitor.ts"),
              String(worker.pid),
              stage,
              tmp,
            ],
            { detached: true, stdio: ["pipe", "ignore", "ignore"], windowsHide: true },
          )
        : spawn(
            "/bin/sh",
            [
              "-c",
              'e=; while read -r line; do [ "$line" = exited ] && e=1; done; [ -n "$e" ] || kill -s KILL -- "-$1"; rm -rf -- "$2" "$3"',
              "sh",
              String(worker.pid),
              stage,
              tmp,
            ],
            { detached: true, stdio: ["pipe", "ignore", "ignore"], windowsHide: true },
          );
    janitor.stdin?.on("error", () => {});
    const exited = new Promise<number>((resolve) =>
      worker.on("exit", (code) => {
        janitor?.stdin?.write("exited\n");
        resolve(code ?? 2);
      }),
    );
    await Promise.race([stopped, exited]);
    if (process.platform === "win32") worker.kill();
    else await killGroup(worker.pid as number);
    const verdict = await exited;
    if (stop) {
      console.error(`${stop} stopped the check, so the command wrote nothing.`);
      exitCode = 128 + os.constants.signals[stop];
    } else if (worker.signalCode) {
      console.error(`${worker.signalCode} killed the check, so the command wrote nothing.`);
      exitCode = 2;
    } else if ((verdict === 0 || verdict === 1) && fs.existsSync(done)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      try {
        try {
          fs.renameSync(done, dest);
        } catch (error) {
          if (
            process.platform !== "win32" ||
            codeOf(error) !== "EPERM" ||
            !fs.statSync(dest, { throwIfNoEntry: false })?.isDirectory()
          )
            throw error;
          fs.rmdirSync(dest);
          for (let attempt = 1; ; attempt++)
            try {
              fs.renameSync(done, dest);
              break;
            } catch (error) {
              if (codeOf(error) === "EPERM" && attempt < 20) await sleep(100);
              else {
                fs.mkdirSync(dest, { recursive: true });
                throw new Error(
                  `${out} could not take the output, so the command wrote nothing. ${messageOf(error)}.`,
                  { cause: error },
                );
              }
            }
        }
      } catch (error) {
        if (codeOf(error) !== "ENOTEMPTY" && codeOf(error) !== "EEXIST") throw error;
        throw new Error(
          `${path.join(out, fs.readdirSync(dest).sort()[0])} appeared while the check ran, so the command wrote nothing. Pass --out with a new folder.`,
          { cause: error },
        );
      }
      process.stdout.write(fs.readFileSync(path.join(dest, "report.md")));
      console.log(`\nWrote ${out}`);
      exitCode = verdict;
    } else {
      if (verdict === 0 || verdict === 1)
        console.error("Something killed the check, so the command wrote nothing.");
      exitCode = 2;
    }
  } finally {
    fs.rmSync(stage, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    janitor?.kill("SIGKILL");
  }
  process.exit(exitCode);
} catch (error) {
  console.error(messageOf(error));
  process.exit(2);
}
