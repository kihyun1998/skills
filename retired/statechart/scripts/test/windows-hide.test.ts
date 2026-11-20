import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const skipString = (text: string, at: number) => {
  const quote = text[at];
  for (let i = at + 1; i < text.length; i++) {
    if (text[i] === "\\") i++;
    else if (text[i] === quote) return i;
    else if (quote === "`" && text.startsWith("${", i)) i = closeOf(text, i + 1);
  }
  return text.length;
};

const skipRegex = (text: string, at: number) => {
  for (let i = at + 1, inClass = false; i < text.length; i++) {
    if (text[i] === "\\") i++;
    else if (text[i] === "[") inClass = true;
    else if (text[i] === "]") inClass = false;
    else if (text[i] === "/" && !inClass) return i;
  }
  return text.length;
};

const closeOf = (text: string, open: number) => {
  const pair = { "(": ")", "{": "}", "[": "]" } as Record<string, string>;
  const stack = [pair[text[open]]];
  for (let i = open + 1; i < text.length; i++) {
    const c = text[i];
    if (text.startsWith("//", i)) i = text.indexOf("\n", i) < 0 ? text.length : text.indexOf("\n", i);
    else if (text.startsWith("/*", i)) i = text.indexOf("*/", i) < 0 ? text.length : text.indexOf("*/", i) + 1;
    else if (c === "/" && /[(,=:[!&|?{};]$|^$/.test(text.slice(open, i).trimEnd().slice(-1))) i = skipRegex(text, i);
    else if (c === '"' || c === "'" || c === "`") i = skipString(text, i);
    else if (c in pair) stack.push(pair[c]);
    else if (c === stack.at(-1)) {
      stack.pop();
      if (!stack.length) return i;
    }
  }
  return text.length;
};

const callsWithout = (text: string) =>
  [...text.matchAll(/\b(?:spawn|spawnSync|execFile|execFileSync)\s*\(/g)]
    .filter((call) => {
      const open = call.index + call[0].length - 1;
      return !/windowsHide:\s*true/.test(text.slice(open, closeOf(text, open) + 1));
    })
    .map((call) => text.slice(0, call.index).split("\n").length);

test("the scan ends a call at its own closing parenthesis past a quote in a regex literal or a comment", () => {
  const call = "spawn";
  const text = [
    `${call}("a", ["it's"].map((s) => s.replace(/'/g, "")), { stdio: "ignore" });`,
    `${call}("b", [], {\n  // it's hidden below\n  stdio: "ignore",\n});`,
    `${call}("c", [/"/.source], { windowsHide: true });`,
    `${call}("d", [], { windowsHide: true });`,
  ].join("\n");
  assert.deepEqual(callsWithout(text), [1, 2]);
});

test("every process the scripts and their tests start passes windowsHide: true", () => {
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const name of fs.readdirSync(scripts, { recursive: true, encoding: "utf8" })) {
    if (!name.endsWith(".ts") || name.split(path.sep).includes("node_modules")) continue;
    const text = fs.readFileSync(path.join(scripts, name), "utf8");
    if (/\b(?:spawn|spawnSync|execFile|execFileSync)\s*\(/.test(text)) seen.add(name.replaceAll(path.sep, "/"));
    for (const line of callsWithout(text)) missing.push(`${name.replaceAll(path.sep, "/")}:${line}`);
  }
  assert.ok(seen.has("statechart.ts") && seen.has("run.ts") && seen.has("test/cli.test.ts"), "the scan found the calls");
  assert.deepEqual(
    missing,
    [],
    "These calls start a process without windowsHide: true. Add it to each call's options: on Windows a detached process has no console, so every console program it starts (java, mise) opens a visible window.",
  );
});
