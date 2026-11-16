import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

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
  onDismiss,
  onEdit,
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
} from './run'
import type { Kind, Run } from '../types'

const run = atom({ plugin: 'thegraph-panel', key: 'run' } as const, null)
const isPaneOpen = atom({ plugin: 'thegraph-panel', key: 'isPaneOpen' } as const, false)
const now = atom({ plugin: 'thegraph-panel', key: 'now' } as const, 0)
const turnLines = atom({ plugin: 'thegraph-panel', key: 'turnLines' } as const, {})
const workers = atom({ plugin: 'thegraph-panel', key: 'workers' } as const, [])
const chip = atom({ plugin: 'thegraph-panel', key: 'chip' } as const, null)

const PANE = 'thegraph'
/** A running step's minutes redraw this often while nothing else happens. */
const TICK_MS = 30_000

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

// A run started afresh: no workers from the one before.
const beginRun = async ($: EngineInterface, next: Run) => {
  await update($, workers, () => [])
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

const tick = async ($: EngineInterface) => {
  const r = await read($, run)
  if (r !== null && r.doneAt === null) {
    const t = await $.clock.now()
    await setNow($, t)
    // A write the tool hooks did not see (another process, a missed call) still shows within a tick.
    await checkSheet($)
    await checkIssueFile($)
    await checkIssueGh($)
    await refreshWorkers($)
  }
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

// A field of a tool's result, which reaches this module untyped.
const field = (value: unknown, key: string): unknown =>
  value !== null && typeof value === 'object' && key in value ? (value as Record<string, unknown>)[key] : undefined
const resultOf = (result: object): unknown => ('result' in result ? result.result : undefined)

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
        const t = await $.clock.now()
        const before = await read($, run)
        // A slash command (/reload-plugins, /context) answers nothing, though it does move on from a finished run.
        const isCommand = e.text.trimStart().startsWith('/')
        if (before !== null && (!isCommand || before.doneAt !== null)) {
          const after = onAnswer(before, t)
          await setRun($, () => after)
          if (after === null) await closePane($)
        }
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

  // A question put to the person inside a turn: the confirm stop is often asked this way,
  // and its reply is the answer no prompt would bring.
  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    if (e.agentId !== undefined || (await read($, run)) === null) return next(e)
    const asked = await $.clock.now()
    const questions = e.questions.map(q => q.question)
    await setRun($, r =>
      r === null ? r : questions.reduce((acc, q) => addLog(acc, { at: asked, kind: 'ask', text: q, detail: null }), onTurnEnd(r, asked)),
    )
    const result = await next(e)
    const t = await $.clock.now()
    const answers = (field(resultOf(result), 'answers') ?? {}) as Record<string, string>
    // Esc puts the box away with nothing answered, however the engine words it (a deny, an error,
    // no answers): no answer at all, and the run is not taken as answered.
    const isDismissed = !questions.some(q => answers[q] !== undefined)
    await setRun($, r => {
      if (r === null) return r
      // Each question's line, newest first, gets its answer; one left unanswered says so.
      const log = [...r.log]
      for (const q of questions) {
        const i = log.findLastIndex(l => l.kind === 'ask' && l.text === q && l.detail === null)
        const entry = log[i]
        if (entry) log[i] = { ...entry, detail: isDismissed ? 'dismissed' : (answers[q] ?? 'no answer') }
      }
      // A finished run is moved on from by a prompt, never by a question inside the turn.
      return isDismissed ? onDismiss({ ...r, log }) : (onAnswer({ ...r, log }, t) ?? { ...r, log })
    })
    await setNow($, t)
    return result
  }).catch(($, e, next) => next(e))

  // A write to the run sheet is the run's own account: read it back once written.
  // Any other file edit right after the confirm is make-it begun without its skill.
  on('tool.call', { tool: ['Edit', 'Write', 'NotebookEdit'] }, async ($, e, next) => {
    if (e.agentId !== undefined || (await read($, run)) === null) return next(e)
    const path = 'file_path' in e ? e.file_path : undefined
    if (path !== undefined && isSheetPath(path)) {
      // The run named its own sheet (no path was handed to it, or it kept an older one): follow it.
      await setRun($, r => (r === null || r.sheetPath === path ? r : { ...r, sheetPath: path }))
      sheetSeen = -1
      return next(e)
    }
    const t = await $.clock.now()
    await setRun($, r => (r === null ? r : onEdit(r, t)))
    const result = await next(e)
    if (path !== undefined && !('deny' in result && result.deny !== undefined)) {
      const isNew = field(resultOf(result), 'type') === 'create'
      const name = path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
      await setRun($, r => (r === null ? r : addLog(r, { at: t, kind: 'edit', text: name, detail: null, isOk: isNew })))
    }
    return result
  }).catch(($, e, next) => next(e))

  // A shell command that runs tests: its result goes in the log, with the counts it printed.
  // One that closes the run's GitHub issue ends the run.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const r = e.agentId === undefined ? await read($, run) : null
    const runner = testOf(e.command)
    const issue = r === null ? null : issueOf(r.sheet?.source, cwd)
    const isClose = issue?.kind === 'github' && closesIssue(e.command, issue.number)
    const report = r?.kind === 'worker' ? reportOf(e.command) : null
    const ends = report === 'done' || report === 'stuck' ? report : null
    if (r === null || (runner === null && !isClose && ends === null)) return next(e)
    const result = await next(e)
    const t = await $.clock.now()
    const done = resultOf(result)
    const out = `${String(field(done, 'stdout') ?? '')}\n${String(field(done, 'stderr') ?? '')}`
    const isOk = done !== undefined && !('isError' in result && result.isError === true) && field(done, 'interrupted') !== true
    if (runner !== null) await setRun($, r2 => (r2 === null ? r2 : addLog(r2, { at: t, kind: 'test', text: runner, detail: testCounts(out), isOk })))
    if (isClose && isOk) await closeByIssue($)
    // Sent to the conductor: the worker's run ends with this turn, unless it takes a step up again.
    if (ends !== null && isOk) await setRun($, r2 => (r2 === null || r2.doneAt !== null ? r2 : { ...r2, reported: ends }))
    return result
  }).catch(($, e, next) => next(e))

  // A worker reading its brief: the brief names the worker's issue.
  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const result = await next(e)
    const herd = e.agentId === undefined ? (await read($, run))?.herd : null
    if (herd != null && isBriefOf(e.file_path, herd.runId, herd.slug)) await readBrief($, e.file_path)
    return result
  }).catch(($, e, next) => next(e))

  // Whatever tool wrote it (Bash, Write, a script), the sheet changes only under a tool call:
  // look at its modification time once each main-thread call has run, and at the workers.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      await checkSheet($)
      await checkIssueFile($)
      await refreshWorkers($)
    }
    return result
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
              <Text color={l.isOk ? 'success' : 'error'}>{l.isOk ? '✓ ' : '✗ '}</Text>
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
