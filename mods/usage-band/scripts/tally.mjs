#!/usr/bin/env node
// This machine's Claude Code tokens since the week began and since today began, read from
// the transcripts as ccusage reads them; usage-band splits the week's limit by their ratio
// on a day whose start no reading saw. Prints { "window": n, "today": n }.
//
//   node tally.mjs <week start, epoch ms> <today's start, epoch ms>
//
// A token is weighed by what it costs against the others (cache reads cheap, output dear),
// the same for every model: the ratio of two days is what is wanted, not a price.
import { createReadStream, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const [weekStart, todayStart] = process.argv.slice(2).map(Number)
if (!Number.isFinite(weekStart) || !Number.isFinite(todayStart)) {
  console.error('usage: node tally.mjs <week start ms> <today start ms>')
  process.exit(2)
}

const root = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'), 'projects')
const files = []
const walk = dir => {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const path = join(dir, e.name)
    if (e.isDirectory()) walk(path)
    // A file last written before the week began holds nothing of it.
    else if (e.name.endsWith('.jsonl') && statSync(path).mtimeMs >= weekStart) files.push(path)
  }
}
walk(root)

const weigh = u =>
  (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1 + (u.output_tokens ?? 0) * 5

let window = 0
let today = 0
// A response is written once per content block; it counts once.
const seen = new Set()
for (const file of files) {
  for await (const line of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) {
    if (!line.includes('"usage"')) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    const usage = entry.message?.usage
    const at = Date.parse(entry.timestamp)
    if (!usage || !(at >= weekStart)) continue
    const id = `${entry.message.id}:${entry.requestId}`
    if (seen.has(id)) continue
    seen.add(id)
    const w = weigh(usage)
    window += w
    if (at >= todayStart) today += w
  }
}
console.log(JSON.stringify({ window, today }))
