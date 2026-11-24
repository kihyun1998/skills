#!/usr/bin/env node
// It runs unconditionally: it is reached through the ~/.claude/skills
// link, where argv[1] and import.meta.url name different paths.

import { readFileSync } from 'node:fs';
import { codexVerdict } from './runners.mjs';

process.stdout.write(codexVerdict(readFileSync(0, 'utf8'), { platform: process.platform, env: process.env }));
