#!/usr/bin/env node
// It runs unconditionally: it is reached through the ~/.claude/skills
// link, where argv[1] and import.meta.url name different paths.

import { readFileSync } from 'node:fs';
import { decide } from './model-run-check.mjs';

const { code, message } = decide(readFileSync(0, 'utf8'), { env: process.env });
if (message) process.stderr.write(`${message}\n`);
process.exit(code);
