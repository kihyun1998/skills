#!/usr/bin/env node
// The gate for mods/: every mod validates (`claude plugin validate`) and its tests
// pass (`claude plugin test`). Exits 1 on the first mod that fails either.
// Pass mod names to check only those: node scripts/check-mods.mjs usage-band

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const modsDir = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'mods')
const only = process.argv.slice(2)

// No shell, for the reason install-mods.mjs gives.
const claude = (...cliArgs) => {
  let r = spawnSync('claude', cliArgs, { encoding: 'utf8' })
  if (r.error && process.platform === 'win32') {
    r = spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/c', 'claude', ...cliArgs], { encoding: 'utf8' })
  }
  if (r.error) throw r.error
  return r
}

const mods = existsSync(modsDir)
  ? readdirSync(modsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && existsSync(join(modsDir, d.name, '.claude-plugin', 'plugin.json')))
      .map(d => d.name)
      .filter(name => only.length === 0 || only.includes(name))
      .sort()
  : []

const unknown = only.filter(name => !mods.includes(name))
if (unknown.length > 0) {
  console.error(`no such mod: ${unknown.join(', ')}`)
  process.exit(2)
}

let failed = 0
for (const name of mods) {
  const dir = join(modsDir, name)
  const validate = claude('plugin', 'validate', dir)
  const test = validate.status === 0 ? claude('plugin', 'test', dir) : null
  const summary = test ? (`${test.stdout}\n${test.stderr}`.match(/(\d+) pass[\s\S]*?(\d+) fail/) ?? []) : []
  if (validate.status !== 0) {
    failed++
    console.log(`  fail  ${name}: does not validate\n${validate.stdout}${validate.stderr}`)
  } else if (test.status !== 0) {
    failed++
    console.log(`  fail  ${name}: tests fail\n${test.stdout}${test.stderr}`)
  } else {
    console.log(`  ok    ${name}: validates, ${summary[1] ?? '?'} tests pass`)
  }
}
if (mods.length === 0) console.log('No mods found.')
process.exit(failed > 0 ? 1 : 0)
