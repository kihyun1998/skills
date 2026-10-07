#!/usr/bin/env node
// Sync every mod in this repo's mods/ into Claude Code as a user-scope plugin,
// installed from this repo's marketplace (.claude-plugin/marketplace.json).
//
// A sync, as install-skills is: the marketplace file is rewritten from the mods
// on disk, every mod is validated and installed (or enabled), and a plugin from
// this marketplace whose mod is gone is uninstalled.
//
//   --uninstall   remove every mod and the marketplace.
//   --dry-run -n  print the changes and make none.
//
// install-mods.ps1 and install-mods.sh only run this file. mods/README.md holds
// the layout a mod folder must have.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MARKETPLACE = {
  name: 'kihyun-skills',
  description: "Claude Code mods (hooks plugins) from Ki Hyun Park's skills repo.",
  owner: { name: 'Ki Hyun Park' },
}

const args = process.argv.slice(2)
for (const a of args) {
  if (!['--uninstall', '--dry-run', '-n'].includes(a)) {
    console.error(`unknown option: ${a}`)
    process.exit(2)
  }
}
const isUninstall = args.includes('--uninstall')
const isDryRun = args.includes('--dry-run') || args.includes('-n')

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modsDir = join(repoRoot, 'mods')
const marketplacePath = join(repoRoot, '.claude-plugin', 'marketplace.json')

const say = (verb, what) => console.log(`  ${verb === 'ok' || !isDryRun ? '' : 'would '}${verb.padEnd(9)} ${what}`)
const fail = message => {
  console.error(`  fail      ${message}`)
  process.exit(1)
}

// --- the claude CLI ---------------------------------------------------------------

// No shell: it would join the arguments unquoted. A native install is claude.exe, which
// starts as is; an npm install on Windows is claude.cmd, which only cmd.exe starts.
const claude = (...cliArgs) => {
  let r = spawnSync('claude', cliArgs, { encoding: 'utf8' })
  if (r.error && process.platform === 'win32') {
    r = spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/c', 'claude', ...cliArgs], { encoding: 'utf8' })
  }
  if (r.error) fail(`could not run claude: ${r.error.message}`)
  return r
}
const claudeJson = (...cliArgs) => {
  const r = claude(...cliArgs, '--json')
  if (r.status !== 0) fail(`claude ${cliArgs.join(' ')}:\n${r.stderr || r.stdout}`)
  return JSON.parse(r.stdout)
}
const change = (verb, what, ...cliArgs) => {
  say(verb, what)
  if (isDryRun) return
  const r = claude(...cliArgs)
  if (r.status !== 0) fail(`claude ${cliArgs.join(' ')}:\n${r.stderr || r.stdout}`)
}

// --- the mods on disk ---------------------------------------------------------------

const readMods = () => {
  if (!existsSync(modsDir)) return []
  const mods = []
  for (const d of readdirSync(modsDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue
    const manifest = join(modsDir, d.name, '.claude-plugin', 'plugin.json')
    if (!existsSync(manifest)) continue
    const { name, description } = JSON.parse(readFileSync(manifest, 'utf8'))
    if (name !== d.name) fail(`mods/${d.name}: plugin.json names it "${name}"; the folder and the name must match`)
    mods.push({ name, description: description ?? '', dir: join(modsDir, d.name) })
  }
  return mods.sort((a, b) => a.name.localeCompare(b.name))
}

// The marketplace file is derived: one entry per mod folder, in name order.
const syncMarketplaceFile = mods => {
  const wanted = JSON.stringify(
    {
      ...MARKETPLACE,
      plugins: mods.map(m => ({ name: m.name, source: `./mods/${m.name}`, description: m.description })),
    },
    null,
    2,
  ) + '\n'
  const current = existsSync(marketplacePath) ? readFileSync(marketplacePath, 'utf8').replaceAll('\r\n', '\n') : ''
  if (current === wanted) return
  say('write', '.claude-plugin/marketplace.json (commit it: installs from GitHub read the committed copy)')
  if (!isDryRun) writeFileSync(marketplacePath, wanted)
}

// --- run ------------------------------------------------------------------------------

const idOf = name => `${name}@${MARKETPLACE.name}`
const ours = p => p.scope === 'user' && p.id.endsWith(`@${MARKETPLACE.name}`)

const mods = readMods()
console.log(`${isDryRun ? 'Dry run: ' : ''}${isUninstall ? 'Uninstalling' : 'Syncing'} mods: ${mods.map(m => m.name).join(', ') || '(none)'}`)

const markets = claudeJson('plugin', 'marketplace', 'list')
const market = markets.find(m => m.name === MARKETPLACE.name)
const installed = claudeJson('plugin', 'list').filter(ours)

if (isUninstall) {
  for (const p of installed) change('uninstall', p.id, 'plugin', 'uninstall', p.id, '--scope', 'user')
  if (market) change('remove', `marketplace ${MARKETPLACE.name}`, 'plugin', 'marketplace', 'remove', MARKETPLACE.name)
  console.log('Done. A session already open drops them when it restarts.')
  process.exit(0)
}

const samePath = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (market && market.path && !samePath(resolve(market.path), repoRoot)) {
  fail(`marketplace ${MARKETPLACE.name} is already added from ${market.path}; remove it first (claude plugin marketplace remove ${MARKETPLACE.name})`)
}

for (const m of mods) {
  const r = claude('plugin', 'validate', m.dir)
  if (r.status !== 0) fail(`mods/${m.name} does not validate:\n${r.stdout}${r.stderr}`)
}

syncMarketplaceFile(mods)

if (!market) change('add', `marketplace ${MARKETPLACE.name} (${repoRoot})`, 'plugin', 'marketplace', 'add', repoRoot)
else change('refresh', `marketplace ${MARKETPLACE.name}`, 'plugin', 'marketplace', 'update', MARKETPLACE.name)

for (const m of mods) {
  const p = installed.find(x => x.id === idOf(m.name))
  if (!p) change('install', idOf(m.name), 'plugin', 'install', idOf(m.name), '--scope', 'user')
  else if (!p.enabled) change('enable', idOf(m.name), 'plugin', 'enable', idOf(m.name))
  else say('ok', `${idOf(m.name)} installed`)
}

for (const p of installed) {
  if (!mods.some(m => idOf(m.name) === p.id)) change('prune', `${p.id} (its mod folder is gone)`, 'plugin', 'uninstall', p.id, '--scope', 'user')
}

// The old way of loading a mod, by folder, would load it a second time beside the install.
const settingsPath = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'), 'settings.json')
const pluginDirs = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, 'utf8')).env?.CLAUDE_CODE_PLUGIN_DIRS : undefined
for (const m of mods) {
  if (pluginDirs?.toLowerCase().includes(m.dir.toLowerCase())) {
    console.warn(`  warn      ${m.name} is also named in CLAUDE_CODE_PLUGIN_DIRS in ${settingsPath}; remove it there or it loads twice`)
  }
}

console.log('Done. A session already open picks this up after /reload-plugins.')
