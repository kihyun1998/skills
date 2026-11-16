import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMessage } from 'claude-code'

import {
  closesIssue,
  focusOf,
  isClosedStatus,
  isDone,
  issueOf,
  onIssueClosed,
  isSheetPath,
  labelOf,
  minutes,
  onAnswer,
  onEdit,
  onReply,
  onSkill,
  onTurnEnd,
  parseSheet,
  STEP_COLOR,
  gantt,
  stepAt,
  turnSummary,
  keepTurnLine,
  turnLineOf,
  addLog,
  runName,
  sheetLog,
  testCounts,
  testOf,
  baseName,
  sheetLine,
  sheetPathFor,
  routeName,
  startRun,
  stepLabel,
  stepsOf,
  childrenOf,
  isBriefOf,
  chipOf,
  pressOf,
  kindOfPrompt,
  parseBrief,
  parseTerminals,
  reportOf,
  runIdOf,
  workerOf,
  usesIn,
  resultsIn,
  recordIn,
} from './run'
import type { Call, Kind, Run } from '../types'

const run = atom({ plugin: 'thegraph-panel', key: 'run' } as const, null)
const isPaneOpen = atom({ plugin: 'thegraph-panel', key: 'isPaneOpen' } as const, false)
const now = atom({ plugin: 'thegraph-panel', key: 'now' } as const, 0)
const turnLines = atom({ plugin: 'thegraph-panel', key: 'turnLines' } as const, {})
const workers = atom({ plugin: 'thegraph-panel', key: 'workers' } as const, [])
const chip = atom({ plugin: 'thegraph-panel', key: 'chip' } as const, null)
const calls = atom({ plugin: 'thegraph-panel', key: 'calls' } as const, {})

const PANE = 'thegraph'
/** A running step's minutes redraw this often while nothing else happens. */
const TICK_MS = 30_000
/** The sheet, the issue file, the workers and a worker's brief are looked at this often with no row to prompt it. */
const RECHECK_MS = 5_000
/** A call's stored record is looked for this long after its result's row: inside that row's hook the transcript does not hold it yet. */
const SETTLE_MS = 300
/** A result whose record has not shown by now has none, and is applied without it. */
const STALE_MS = 2_000

/** Cells for a step's name: before its gantt bar, and in the log's step column. */
const STEP_CELLS = 10

/** Turn lines kept, the oldest dropped first. */
const TURN_LINES_MAX = 200

// When the last main-thread turn ended: a turn's summary counts what the log gained since.
let lastTurnEnd = 0

// What followed /thegraph on the prompt, waiting for the skill to expand. Lost on a reload: the run starts unlabelled.
let pendingLabel: string | null = null

/** hc and herdr-app get this long to answer. */
const HC_MS = 5_000
// This session's hc terminal, from $HC_TERMINAL_ID: unset outside Herdr, and then hc is never asked.
let hcId: string | null = null

// The session's folder, whose name heads each sheet's file name; and the OS temp folder, asked once.
let cwd: string | null = null
let tempDir: string | null | undefined
// The sheet's modification time when it was last read, so an unchanged sheet is not read again.
let sheetSeen = -1

/** gh is asked whether the run's GitHub issue is closed at most this often. */
const GH_EVERY_MS = 5 * 60_000
// The issue file's modification time when last read, and whether it was ever there: a path
// never seen is a mistyped one, not an archived issue. When gh was last asked.
let issueSeen = -1
let isIssueFound = false
let ghAskedAt: number | null = null

// A new run watches its own sheet and issue from scratch.
const forgetWatch = () => {
  sheetSeen = -1
  issueSeen = -1
  isIssueFound = false
  ghAskedAt = null
}

// The chip path-band draws, worked out again from the run, its workers and the clock; written only when it changed.
const syncChip = async ($: EngineInterface) => {
  const r = await read($, run)
  const next = chipOf(r, await read($, workers), Math.max(await read($, now), r?.startedAt ?? 0))
  if (JSON.stringify(await read($, chip)) !== JSON.stringify(next)) await update($, chip, () => next)
}

// Writes the run, and the chip after it.
const setRun = async ($: EngineInterface, fn: (r: Run | null) => Run | null) => {
  await update($, run, fn)
  await syncChip($)
}

// Moves the clock the step's minutes are counted on, and the chip after it.
const setNow = async ($: EngineInterface, t: number) => {
  await update($, now, () => t)
  await syncChip($)
}

// A run started afresh: no workers and no calls from the one before. The calls go in their
// turn, after any result being applied, so none of the old run's lands in the new one's log.
const beginRun = async ($: EngineInterface, next: Run) => {
  await update($, workers, () => [])
  await inOrder(async () => {
    await update($, calls, () => ({}))
  })
  await setRun($, () => next)
}

// A herdr conductor's live workers, as hc lists them; a failed or garbled answer leaves the last one.
const refreshWorkers = async ($: EngineInterface) => {
  const r = await read($, run)
  const runId = r === null || r.kind !== 'herdr' || r.doneAt !== null ? null : runIdOf(r.sheetPath)
  if (hcId === null || runId === null) return
  let found
  try {
    const out = await $.process.run(['hc', 'ls', '--json'], { timeoutMs: HC_MS })
    found = out.exitCode === 0 ? parseTerminals(out.stdout) : null
  } catch {
    return
  }
  if (found == null) return
  const ours = found.filter(t => workerOf(t.name)?.runId === runId)
  if (JSON.stringify(ours) !== JSON.stringify(await read($, workers))) await update($, workers, () => ours)
  await syncChip($)
}

// Brings a terminal's tab to the front; one gone since the last refresh leaves everything as it is.
const focusTerminal = async ($: EngineInterface, address: string) => {
  try {
    await $.process.run(['herdr-app', 'do', 'agent.focus', '--terminal', address], { timeoutMs: HC_MS })
  } catch {
    // No herdr-app here, or the terminal ended: nothing to bring forward.
  }
}

// A worker's issue, from its brief; one that cannot be read leaves what was there.
const readBrief = async ($: EngineInterface, path: string) => {
  let text: string
  try {
    text = await $.fs.read(path)
  } catch {
    return
  }
  const sheet = parseBrief(path, text)
  if (sheet.issue === null) return
  await setRun($, r => (r === null || r.kind !== 'worker' ? r : { ...r, sheet }))
}

// The worker's brief in the thegraph temp folder, named after the run id and slug.
const findBrief = async ($: EngineInterface) => {
  const herd = (await read($, run))?.herd
  const temp = herd == null ? null : await askTempDir($)
  if (herd == null || temp === null) return
  const sep = temp.includes('\\') ? '\\' : '/'
  const dir = `${temp.replace(/[\\/]+$/, '')}${sep}thegraph`
  let names: string[]
  try {
    names = (await $.fs.list(dir)).filter(f => f.kind === 'file').map(f => f.name)
  } catch {
    return
  }
  const name = names.find(n => isBriefOf(n, herd.runId, herd.slug))
  if (name !== undefined) await readBrief($, `${dir}${sep}${name}`)
}

// A session in a worker terminal (`tg-<run id>-<slug>`) is that worker's run, with no prompt.
const identifyWorker = async ($: EngineInterface) => {
  try {
    hcId = (await $.env.get('HC_TERMINAL_ID')) || null
  } catch {
    hcId = null
  }
  if (hcId === null) return
  let self: Record<string, unknown>
  try {
    const out = await $.process.run(['hc', 'get', hcId, '--json'], { timeoutMs: HC_MS })
    if (out.exitCode !== 0) return
    self = JSON.parse(out.stdout) as Record<string, unknown>
  } catch {
    return
  }
  const w = workerOf(self.name)
  if (w === null) return
  const r = await read($, run)
  // A reload keeps the worker's run; a run the person started here stands.
  if (r !== null && (r.kind !== 'worker' || (r.herd?.runId === w.runId && r.herd.slug === w.slug))) {
    if (r.kind === 'worker' && r.sheet === null) await findBrief($)
    return
  }
  const t = await $.clock.now()
  const herd = { ...w, conductor: typeof self.parent === 'string' ? self.parent : null }
  await beginRun($, { ...startRun(null, t, 'worker'), herd })
  await setNow($, t)
  await findBrief($)
}

const closeByIssue = async ($: EngineInterface) => {
  const t = await $.clock.now()
  await setRun($, r => (r === null ? r : onIssueClosed(r, t)))
  await setNow($, t)
}

// A local issue file marked done, or gone once seen (archived, moved): the run's issue is closed.
const checkIssueFile = async ($: EngineInterface) => {
  const r = await read($, run)
  const issue = r === null || r.doneAt !== null ? null : issueOf(r.sheet?.source, cwd)
  if (issue?.kind !== 'file') return
  let mtime: number
  try {
    mtime = (await $.fs.stat(issue.path)).mtimeMs
  } catch {
    if (isIssueFound) await closeByIssue($)
    return
  }
  isIssueFound = true
  if (mtime === issueSeen) return
  issueSeen = mtime
  let text: string
  try {
    text = await $.fs.read(issue.path)
  } catch {
    return
  }
  if (isClosedStatus(text)) await closeByIssue($)
}

// A GitHub issue closed anywhere (the web, a merged PR): gh is asked, now and then.
const checkIssueGh = async ($: EngineInterface) => {
  const r = await read($, run)
  const issue = r === null || r.doneAt !== null ? null : issueOf(r.sheet?.source, cwd)
  if (issue?.kind !== 'github') return
  const t = await $.clock.now()
  if (ghAskedAt !== null && t - ghAskedAt < GH_EVERY_MS) return
  ghAskedAt = t
  const argv = ['gh', 'issue', 'view', String(issue.number), ...(issue.repo === null ? [] : ['-R', issue.repo]), '--json', 'state', '--jq', '.state']
  try {
    const out = await $.process.run(argv, { timeoutMs: 10_000 })
    if (out.exitCode === 0 && out.stdout.trim() === 'CLOSED') await closeByIssue($)
  } catch {
    // No gh here, or no network: the next ask may answer.
  }
}

// No shell runs the argv: cmd answers on Windows, sh elsewhere.
const TEMP_ASKS: readonly (readonly string[])[] = [
  ['cmd', '/c', 'echo %TEMP%'],
  ['sh', '-c', 'printf %s "${TMPDIR:-/tmp}"'],
]

const askTempDir = async ($: EngineInterface): Promise<string | null> => {
  if (tempDir !== undefined) return tempDir
  tempDir = null
  for (const argv of TEMP_ASKS) {
    try {
      const r = await $.process.run(argv, { timeoutMs: 5_000 })
      const dir = r.stdout.trim()
      if (r.exitCode === 0 && dir !== '' && !dir.includes('%')) {
        tempDir = dir
        break
      }
    } catch {
      // This one cannot start here; ask the next.
    }
  }
  return tempDir
}

// Reads the sheet again when its file has changed since the last read.
const checkSheet = async ($: EngineInterface) => {
  const path = (await read($, run))?.sheetPath
  if (path == null) return
  let mtime: number
  try {
    mtime = (await $.fs.stat(path)).mtimeMs
  } catch {
    return
  }
  if (mtime === sheetSeen) return
  sheetSeen = mtime
  await readSheet($, path)
}

// What a tool call, or another process, can have changed: the sheet, the issue file, the
// workers, and the brief a worker has not found yet.
const lookAgain = async ($: EngineInterface) => {
  await checkSheet($)
  await checkIssueFile($)
  await refreshWorkers($)
  const r = await read($, run)
  if (r !== null && r.kind === 'worker' && r.sheet === null) await findBrief($)
}

// The look under way: one asked for meanwhile joins it rather than starting another.
let looking: Promise<void> | null = null
const recheck = ($: EngineInterface): Promise<void> =>
  (looking ??= lookAgain($)
    .catch(() => undefined)
    .finally(() => {
      looking = null
    }))

// After a call has run: a look begun before it ended may have missed what it wrote, so one more follows.
const recheckAfterCall = async ($: EngineInterface) => {
  if (looking !== null) await looking
  await recheck($)
}

const tick = async ($: EngineInterface) => {
  const r = await read($, run)
  if (r !== null && r.doneAt === null) {
    await setNow($, await $.clock.now())
    await checkIssueGh($)
  }
}

// A write no row told of (another process, a call made in a subagent) shows within this tick,
// and a result still waiting for a record that is not coming is applied.
const recheckTick = async ($: EngineInterface) => {
  await inOrder(() => settle($, false))
  const r = await read($, run)
  if (r !== null && r.doneAt === null) await recheck($)
}

// This plugin's own ui.close hook does not run under its own call, so the flag is cleared here.
const closePane = async ($: EngineInterface) => {
  if (await read($, isPaneOpen)) {
    await $.ui.close({ id: PANE })
    await update($, isPaneOpen, () => false)
  }
}

// Closes the pane whatever this plugin remembers: after /clear its state is gone and the pane is not.
const shutPane = async ($: EngineInterface) => {
  try {
    await $.ui.close({ id: PANE })
  } catch {
    // Not open; nothing to close.
  }
  await update($, isPaneOpen, () => false)
}

// A pane open with no run behind it, as /clear or /resume leaves one, is closed.
const shutOrphanPane = async ($: EngineInterface) => {
  if ((await read($, run)) !== null) return
  let isOpen = false
  try {
    isOpen = (await $.ui.panes()).some(p => p.id === PANE)
  } catch {
    return
  }
  if (isOpen) await shutPane($)
}

const togglePane = async ($: EngineInterface) => {
  if (await read($, isPaneOpen)) {
    await closePane($)
    return
  }
  const opened = await $.ui.open({ id: PANE, title: 'thegraph', closeOnEscape: true })
  await update($, isPaneOpen, () => true)
  try {
    await $.ui.scroll({ in: PANE, to: 'end' })
  } catch {
    // Nothing drawn yet to scroll; the pane opens at its top.
  }
  if (!opened.isPlaced) $.ui.toast(`thegraph: the pane waits (${opened.reason})`)
}

// A field of a tool's record, which reaches this module untyped.
const field = (value: unknown, key: string): unknown =>
  value !== null && typeof value === 'object' && key in value ? (value as Record<string, unknown>)[key] : undefined

/** The tools that write a file. */
const EDIT_TOOLS = ['Edit', 'Write', 'NotebookEdit']

// Keeps a call until its result is applied. In $.state, so a reload between the two neither loses it nor applies it twice.
const keepCall = ($: EngineInterface, id: string, call: Call) => update($, calls, c => ({ ...c, [id]: call }))
const dropCall = ($: EngineInterface, id: string) => update($, calls, c => Object.fromEntries(Object.entries(c).filter(([k]) => k !== id)))

// Rows are handled one at a time, so no result is applied twice or while another is being applied.
let rows: Promise<void> = Promise.resolve()
const inOrder = (work: () => Promise<void>): Promise<void> => (rows = rows.then(work).catch(() => undefined))

// A main-thread tool call as the model made it, before it runs.
const onUse = async ($: EngineInterface, use: { id: string; tool: string; input: Record<string, unknown> }) => {
  const r = await read($, run)
  if (r === null) return
  const t = await $.clock.now()
  if (use.tool === 'AskUserQuestion') {
    // A question put to the person inside a turn: the confirm stop is often asked this way.
    const asked: unknown = use.input.questions
    const questions = (Array.isArray(asked) ? asked : []).flatMap((q: unknown) => {
      const text = field(q, 'question')
      return typeof text === 'string' ? [text] : []
    })
    await setRun($, r2 =>
      r2 === null ? r2 : questions.reduce((acc, q) => addLog(acc, { at: t, kind: 'ask', text: q, detail: null }), onTurnEnd(r2, t)),
    )
    await keepCall($, use.id, { kind: 'ask', questions, back: null })
  } else if (EDIT_TOOLS.includes(use.tool)) {
    const path = typeof use.input.file_path === 'string' ? use.input.file_path : undefined
    if (path !== undefined && isSheetPath(path)) {
      // The run named its own sheet (no path was handed to it, or it kept an older one): follow it.
      await setRun($, r2 => (r2 === null || r2.sheetPath === path ? r2 : { ...r2, sheetPath: path }))
      sheetSeen = -1
      return
    }
    // Any other file edit right after the confirm is make-it begun without its skill.
    await setRun($, r2 => (r2 === null ? r2 : onEdit(r2, t)))
    if (path !== undefined) await keepCall($, use.id, { kind: 'edit', name: baseName(path) || path, back: null })
  } else if (use.tool === 'Bash') {
    const command = typeof use.input.command === 'string' ? use.input.command : ''
    const runner = testOf(command)
    const issue = issueOf(r.sheet?.source, cwd)
    const isClose = issue?.kind === 'github' && closesIssue(command, issue.number)
    const report = r.kind === 'worker' ? reportOf(command) : null
    const ends = report === 'done' || report === 'stuck' ? report : null
    if (runner !== null || isClose || ends !== null) await keepCall($, use.id, { kind: 'shell', runner, isClose, report: ends, back: null })
  }
}

// A kept call's result came: what its row carried is kept with the call until its record can be read.
const noteResult = async ($: EngineInterface, result: { id: string; text: string; isError: boolean }) => {
  const at = await $.clock.now()
  await update($, calls, c => {
    const call = c[result.id]
    return call === undefined ? c : { ...c, [result.id]: { ...call, back: { text: result.text, isError: result.isError, at } } }
  })
}

// A call's result, as its row carried it (`back`) and as the transcript stored it (`record`, undefined with none).
const applyResult = async ($: EngineInterface, call: Call, back: NonNullable<Call['back']>, record: unknown) => {
  if ((await read($, run)) === null) return
  const t = back.at
  if (call.kind === 'ask') {
    // The person's reply is the answer no prompt would bring.
    const answers = (field(record, 'answers') ?? {}) as Record<string, string>
    // Esc puts the box away with nothing answered, however the engine words it (an error, no
    // answers). With no record stored, a result that is no error is an answer nobody can read.
    const isDismissed = back.isError || (record !== undefined && !call.questions.some(q => answers[q] !== undefined))
    const detailOf = (q: string) => (isDismissed ? 'dismissed' : (answers[q] ?? (record === undefined ? 'answered' : 'no answer')))
    await setRun($, r => (r === null ? r : onReply(r, call.questions, isDismissed, detailOf, t)))
    await setNow($, await $.clock.now())
  } else if (call.kind === 'edit') {
    if (!back.isError) {
      const isNew = field(record, 'type') === 'create'
      await setRun($, r => (r === null ? r : addLog(r, { at: t, kind: 'edit', text: call.name, detail: null, isOk: isNew })))
    }
  } else {
    // What the command printed: the record's streams where one was stored, and the text the model read.
    const out = `${String(field(record, 'stdout') ?? '')}\n${String(field(record, 'stderr') ?? '')}\n${back.text}`
    const isOk = !back.isError && field(record, 'interrupted') !== true
    // No record, no text and no error mark: the command ran, and how it went cannot be read.
    const isKnown = record !== undefined || back.text !== '' || back.isError
    const runner = call.runner
    if (runner !== null) {
      await setRun($, r => (r === null ? r : addLog(r, { at: t, kind: 'test', text: runner, detail: testCounts(out), ...(isKnown ? { isOk } : {}) })))
    }
    if (call.isClose && isKnown && isOk) await closeByIssue($)
    // A close that cannot be read is checked with gh at once, without holding the rows behind this one.
    if (call.isClose && !isKnown) {
      ghAskedAt = null
      void checkIssueGh($).catch(() => undefined)
    }
    // Sent to the conductor: the worker's run ends with this turn, unless it takes a step up again.
    const ends = call.report
    if (ends !== null && isOk) await setRun($, r => (r === null || r.doneAt !== null ? r : { ...r, reported: ends }))
  }
}

// Applies the results that have come, in the order their calls were made, each with what the
// transcript stored for it. One whose record is not there yet waits, and those after it with it, unless `isFinal`
// (something later has happened: no record is coming) or it has waited STALE_MS.
const settle = async ($: EngineInterface, isFinal: boolean) => {
  const back = Object.entries(await read($, calls)).filter(([, c]) => c.back !== null)
  if (back.length === 0) return
  let messages: SessionMessage[] = []
  try {
    messages = await $.session.messages()
  } catch {
    // The transcript cannot be read: the results stand without their records.
  }
  const now = await $.clock.now()
  for (const [id, call] of back) {
    if (call.back === null) continue
    const record = recordIn(messages, id)
    if (record === undefined && !isFinal && now - call.back.at < STALE_MS) return
    await dropCall($, id)
    await applyResult($, call, call.back, record)
  }
}

// The person typed with no turn running: the results that came are applied as they stand, a
// question still up was put away, and no result is coming for the rest.
const dropCalls = async ($: EngineInterface) => {
  await settle($, true)
  const open = Object.values(await read($, calls))
  if (open.length === 0) return
  await update($, calls, () => ({}))
  const questions = open.flatMap(c => (c.kind === 'ask' ? c.questions : []))
  if (questions.length === 0) return
  const t = await $.clock.now()
  await setRun($, r => (r === null ? r : onReply(r, questions, true, () => 'dismissed', t)))
}

// Reads the run sheet as the model left it; one that cannot be read leaves what was there.
const readSheet = async ($: EngineInterface, path: string) => {
  let text: string
  try {
    text = await $.fs.read(path)
  } catch {
    return
  }
  const sheet = parseSheet(path, text)
  const t = await $.clock.now()
  await setRun($, r => (r === null ? r : sheetLog(r.sheet, sheet, t).reduce(addLog, { ...r, sheet })))
}

// The person gave the run up from the pane: the chip goes, and the pane with it.
const dismiss = async ($: EngineInterface) => {
  await shutPane($)
  await setRun($, () => null)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    const result = await next(e)
    $.clock.every(TICK_MS, () => void tick($))
    $.clock.every(RECHECK_MS, () => void recheckTick($))
    await identifyWorker($)
    // A reload keeps the run but not the chip's shape: path-band draws what is written now.
    await syncChip($)
    return result
  })

  // /clear, /resume and /branch start $.state over without a session.start: a worker is told again.
  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    const result = await next(e)
    await identifyWorker($)
    return result
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    // The person's own words, typed here or through Remote Control; not a notification or another plugin's.
    if (e.origin.kind === 'composer' || e.origin.kind === 'bridge') {
      const label = labelOf(e.text)
      const kind = kindOfPrompt(e.text)
      if (label !== null && kind !== null) {
        // The new run starts here, whatever the first left: its skill restarts it, named, if it expands.
        pendingLabel = label
        const t = await $.clock.now()
        await beginRun($, startRun(label, t, kind))
        forgetWatch()
        await setNow($, t)
      } else {
        pendingLabel = null
        await shutOrphanPane($)
        // Typed over a running turn, a prompt says nothing of the calls under way: their results still come.
        if (e.turnId === undefined) await inOrder(() => dropCalls($))
        const t = await $.clock.now()
        // A slash command (/reload-plugins, /context) answers nothing, though it does move on from a finished run.
        const isCommand = e.text.trimStart().startsWith('/')
        let isMovedOn = false
        await setRun($, r => {
          if (r === null || (isCommand && r.doneAt === null)) return r
          const after = onAnswer(r, t)
          isMovedOn = after === null
          return after
        })
        if (isMovedOn) await closePane($)
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('skill.prompt', async ($, e, next) => {
    const t = await $.clock.now()
    if (e.skill === 'thegraph' || e.skill === 'thegraph-herdr') {
      // Name this run's sheet now and tell the run, so the one file is known to be ours.
      const kind: Kind = e.skill === 'thegraph' ? 'thegraph' : 'herdr'
      const temp = await askTempDir($)
      const hex = Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0')
      const sheetPath = temp === null ? null : sheetPathFor(temp, baseName(cwd ?? '') || 'repo', t, hex)
      await beginRun($, { ...startRun(pendingLabel, t, kind), sheetPath })
      pendingLabel = null
      forgetWatch()
      await setNow($, t)
      const result = await next(e)
      return sheetPath === null ? result : { ...result, text: result.text + sheetLine(sheetPath) }
    }
    if ((await read($, run)) !== null) {
      await setRun($, r => (r === null ? r : onSkill(r, e.skill, t)))
    }
    await setNow($, t)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    // The turn's last results count in its summary.
    if (e.agentId === undefined) await inOrder(() => settle($, true))
    const r = await read($, run)
    if (e.agentId === undefined && !e.isAborted && r !== null) {
      const t = await $.clock.now()
      const since = Math.max(lastTurnEnd, r.startedAt)
      const focus = focusOf(r)
      const step = focus?.key ?? r.log.findLast(l => l.kind === 'step')?.text ?? null
      const line = turnSummary(r.log, since, step)
      await update($, turnLines, lines => keepTurnLine(lines, e.durationMs, line, TURN_LINES_MAX))
      lastTurnEnd = t
      await setRun($, r2 => (r2 === null ? r2 : onTurnEnd(r2, t)))
      await setNow($, t)
    }
    return next(e)
  })

  // While the run works, the spinner says where it is: `… · thegraph make-it 3/5 · ✎5`.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const r = await read($, run)
    const focus = r === null ? null : focusOf(r)
    if (r === null || focus === null) return next(e)
    const total = stepsOf(r).length
    const edits = r.log.filter(l => l.kind === 'edit' && l.at >= Math.max(lastTurnEnd, r.startedAt)).length
    const tail = `… · thegraph ${stepLabel(focus.key, focus.state)} ${focus.index + 1}/${total}${edits > 0 ? ` · ✎${edits}` : ''}`
    return next({ ...e, props: { ...e.props, suffix: tail } })
  })

  // A turn's closing line keeps what that turn did, beside the engine's own words.
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const line = turnLineOf(await read($, turnLines), e.props.durationMs)
    if (line === undefined) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const theirs = await next(e)
    return (
      <Box flexDirection="row">
        {theirs}
        <Text dimColor={false}>
          {line.map(seg => (seg.color === null ? <Text dimColor>{seg.text}</Text> : <Text color={seg.color}>{seg.text}</Text>))}
        </Text>
      </Box>
    )
  })

  // The model's tool calls, seen as the rows the session keeps: a response row carries the
  // tool_use, a tool-result row its result, paired by the call's id. No tool event is hooked:
  // one would keep Code Mode from starting.
  on('session.append', { door: 'response' }, async ($, e, next) => {
    const stored = await next(e)
    if (e.agentId === undefined) {
      // The model has gone on: what came before is settled first, with or without its record.
      await inOrder(async () => {
        await settle($, true)
        for (const use of usesIn(e.message.content)) await onUse($, use)
      })
    }
    return stored
  }).catch(($, e, next) => next(e))

  // Whatever tool wrote it (Bash, Write, a script), the sheet changes under a tool call: once
  // each main-thread call's result is kept, look at the sheet, the issue file and the workers.
  on('session.append', { door: 'tool-result' }, async ($, e, next) => {
    const stored = await next(e)
    if (e.agentId === undefined) {
      await inOrder(async () => {
        for (const result of resultsIn(e.message.content)) await noteResult($, result)
        await settle($, false)
      })
      $.clock.after(SETTLE_MS, () => void inOrder(() => settle($, false)))
      await recheckAfterCall($)
    }
    return stored
  }).catch(($, e, next) => next(e))

  // The person's close (its mark, ctrl+x x, Esc) as much as the button's.
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) await update($, isPaneOpen, () => false)
    return next(e)
  }).catch(($, e, next) => next(e))

  // path-band draws the run's chip and its buttons on its line (ADR-0099); a press on one is this plugin's to act on.
  on('ui.press', { plugin: 'path-band' }, async ($, e, next) => {
    const act = pressOf(e.element, await read($, chip))
    if (act === null) return next(e)
    if (act.kind === 'pane') await togglePane($)
    else await focusTerminal($, act.address)
    return { element: e.element }
  }).catch(($, e, next) => next(e))

  // The pane: a header, a gantt of the steps, then the log as a table, oldest first, opened at its end.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const r = await read($, run)
    // The pane's own way out: path-band's chip goes with the run, and /clear takes the run.
    const close = (
      <Box flexDirection="row" flexShrink={0}>
        <Text> </Text>
        <Button key="close" role="dismiss" hotkey="q" dimColor onPress={() => shutPane($)}>
          close
        </Button>
        {e.viewport?.isFullscreen === false && <Text dimColor> ^x x</Text>}
      </Box>
    )
    if (r === null) {
      return (
        <Box flexDirection="row" justifyContent="space-between">
          <Text dimColor>thegraph is not running.</Text>
          {close}
        </Box>
      )
    }
    const t = Math.max(await read($, now), r.startedAt)
    const route = r.sheet?.route ?? (r.route === null ? null : routeName(r.route))
    const name = runName(r)
    // The gantt: a row per step, the run's time across, filled wherever that step ran.
    const end = Math.max(t, r.doneAt ?? 0)
    const bars = gantt(r, end, Math.max(8, Math.min(48, e.props.bodyColumns - STEP_CELLS - 5))).map(g => (
      <Text wrap="truncate-end">
        <Text bold={g.state === 'run' || g.state === 'wait'} dimColor={g.state === 'todo'}>{g.key.padEnd(STEP_CELLS)}</Text>
        {g.cells.map(c => (c ? <Text color={STEP_COLOR[g.key] ?? 'white'}>█</Text> : <Text dimColor>·</Text>))}
        <Text dimColor>{` ${g.ms === null ? '–' : minutes(g.ms)}`.padStart(5)}</Text>
      </Text>
    ))
    const lines = r.log.map((l, i) => {
      const at = `+${String(Math.floor((l.at - r.startedAt) / 60_000)).padStart(2)}m `
      const step = stepAt(r, l.at)
      const prev = r.log[i - 1]
      const isFirst = prev === undefined || stepAt(r, prev.at) !== step
      return (
        <Text wrap="wrap">
          <Text dimColor>{at}</Text>
          {isFirst && step !== null
            ? <Text color={STEP_COLOR[step.split(' ')[0] ?? ''] ?? undefined}>{step.padEnd(STEP_CELLS + 1)}</Text>
            : <Text dimColor>{(step === null ? '' : '│').padEnd(STEP_CELLS + 1)}</Text>}
          {l.kind === 'step' && <Text bold>{`▸ ${l.text}`}</Text>}
          {l.kind === 'ask' && (
            <Text>
              <Text color="warning">◆ </Text>
              <Text>{l.text}</Text>
              {l.detail === null ? <Text color="warning">  …waiting</Text> : <Text dimColor> → </Text>}
              {l.detail !== null && <Text bold>{l.detail}</Text>}
            </Text>
          )}
          {l.kind === 'edit' && <Text color="blue">{`${l.isOk ? '+' : '✎'} ${l.text}`}</Text>}
          {l.kind === 'test' && (
            <Text>
              {l.isOk === undefined ? <Text dimColor>– </Text> : <Text color={l.isOk ? 'success' : 'error'}>{l.isOk ? '✓ ' : '✗ '}</Text>}
              <Text>{l.text}</Text>
              {l.detail !== null && <Text dimColor>{` ${l.detail}`}</Text>}
            </Text>
          )}
          {l.kind === 'signal' && <Text color="magenta">{`⚑ ${l.text}`}</Text>}
          {l.kind === 'note' && <Text dimColor>{`→ ${l.text}`}</Text>}
          {l.kind === 'carry' && <Text color="cyan">{`↗ ${l.text}`}</Text>}
          {l.kind === 'end' && <Text bold color="success">{`✓ ${l.text}`}</Text>}
        </Text>
      )
    })
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          {/* Wraps rather than cuts: the pane is where a name the band cut is read whole. */}
          <Text wrap="wrap">
            <Text bold>thegraph</Text>
            {name !== null && <Text dimColor>{` ${name}`}</Text>}
            {route !== null && <Text color="cyan">{` · ${route}`}</Text>}
            <Text dimColor>{` · ${minutes((r.doneAt ?? t) - r.startedAt)}`}</Text>
            {isDone(r) && <Text color="success"> · done</Text>}
          </Text>
          {close}
        </Box>
        {r.sheet?.source != null && <Text dimColor wrap="wrap">{r.sheet.source}</Text>}
        <Text dimColor>{'─'.repeat(Math.max(8, Math.min(40, e.props.bodyColumns)))}</Text>
        {bars}
        {/* Gives the run up: the pane closes and the chip goes. */}
        <Box flexDirection="row">
          <Button key="clear" hotkey="x" dimColor onPress={() => dismiss($)}>
            clear run ×
          </Button>
          {e.viewport?.isFullscreen === false && <Text dimColor>x</Text>}
        </Box>
        <Text> </Text>
        <Text dimColor>{`time ${'step'.padEnd(STEP_CELLS + 1)}what`}</Text>
        {lines.length === 0 ? <Text dimColor>Nothing logged yet.</Text> : lines}
      </Box>
    )
  })
}
