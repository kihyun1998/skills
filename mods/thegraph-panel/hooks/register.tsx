import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import {
  focusOf,
  isDone,
  isSheetPath,
  labelOf,
  minutes,
  onAnswer,
  onEdit,
  onSkill,
  onTurnEnd,
  parseSheet,
  addLog,
  sheetLog,
  testCounts,
  testOf,
  baseName,
  sheetLine,
  sheetPathFor,
  routeName,
  signalSummary,
  startRun,
  stepLabel,
  stepMs,
  stepsOf,
} from './run'
import type { StepState } from './run'

const run = atom({ plugin: 'thegraph-panel', key: 'run' } as const, null)
const isPaneOpen = atom({ plugin: 'thegraph-panel', key: 'isPaneOpen' } as const, false)
const now = atom({ plugin: 'thegraph-panel', key: 'now' } as const, 0)

const PANE = 'thegraph'
/** Blank cells at the line's left and right, as usage-band keeps, so both share their edges. */
const LEFT = 2
const RIGHT = 1
/** A running step's minutes redraw this often while nothing else happens. */
const TICK_MS = 30_000

const MARK: Record<StepState, string> = { done: '✓', run: '◐', wait: '◆', todo: '' }
/** The line's dot per step. */
const DOT: Record<StepState, string> = { done: '●', run: '◐', wait: '◆', todo: '○' }
const COLOR: Record<StepState, string | undefined> = { done: 'success', run: 'claude', wait: 'warning', todo: undefined }
/** The step being worked on, or waited on, is drawn bold. */
const LOUD: Record<StepState, boolean> = { done: false, run: true, wait: true, todo: false }

// What followed /thegraph on the prompt, waiting for the skill to expand. Lost on a reload: the run starts unlabelled.
let pendingLabel: string | null = null

// The session's folder, whose name heads each sheet's file name; and the OS temp folder, asked once.
let cwd: string | null = null
let tempDir: string | null | undefined
// The sheet's modification time when it was last read, so an unchanged sheet is not read again.
let sheetSeen = -1

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
    await update($, now, () => t)
    // A write the tool hooks did not see (another process, a missed call) still shows within a tick.
    await checkSheet($)
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
  await update($, run, r => (r === null ? r : sheetLog(r.sheet, sheet, t).reduce(addLog, { ...r, sheet })))
}

// The person gave the run up: the line goes, and the pane with it.
const dismiss = async ($: EngineInterface) => {
  await closePane($)
  await update($, run, () => null)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    const result = await next(e)
    $.clock.every(TICK_MS, () => void tick($))
    return result
  })

  on('prompt.submit', async ($, e, next) => {
    // The person's own words, typed here or through Remote Control; not a notification or another plugin's.
    if (e.origin.kind === 'composer' || e.origin.kind === 'bridge') {
      const label = labelOf(e.text)
      if (label !== null) {
        pendingLabel = label
      } else {
        await shutOrphanPane($)
        const t = await $.clock.now()
        const before = await read($, run)
        // A slash command (/reload-plugins, /context) answers nothing, though it does move on from a finished run.
        const isCommand = e.text.trimStart().startsWith('/')
        if (before !== null && (!isCommand || before.doneAt !== null)) {
          const after = onAnswer(before, t)
          await update($, run, () => after)
          if (after === null) await closePane($)
        }
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('skill.prompt', async ($, e, next) => {
    const t = await $.clock.now()
    if (e.skill === 'thegraph') {
      // Name this run's sheet now and tell the run, so the one file is known to be ours.
      const temp = await askTempDir($)
      const hex = Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0')
      const sheetPath = temp === null ? null : sheetPathFor(temp, baseName(cwd ?? '') || 'repo', t, hex)
      await update($, run, () => ({ ...startRun(pendingLabel, t), sheetPath }))
      pendingLabel = null
      sheetSeen = -1
      await update($, now, () => t)
      const result = await next(e)
      return sheetPath === null ? result : { ...result, text: result.text + sheetLine(sheetPath) }
    }
    if ((await read($, run)) !== null) {
      await update($, run, r => (r === null ? r : onSkill(r, e.skill, t)))
    }
    await update($, now, () => t)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && !e.isAborted && (await read($, run)) !== null) {
      const t = await $.clock.now()
      await update($, run, r => (r === null ? r : onTurnEnd(r, t)))
      await update($, now, () => t)
    }
    return next(e)
  })

  // A question put to the person inside a turn: the confirm stop is often asked this way,
  // and its reply is the answer no prompt would bring.
  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    if (e.agentId !== undefined || (await read($, run)) === null) return next(e)
    const asked = await $.clock.now()
    const questions = e.questions.map(q => q.question)
    await update($, run, r =>
      r === null ? r : questions.reduce((acc, q) => addLog(acc, { at: asked, kind: 'ask', text: q, detail: null }), onTurnEnd(r, asked)),
    )
    const result = await next(e)
    const t = await $.clock.now()
    const answers = (field(resultOf(result), 'answers') ?? {}) as Record<string, string>
    await update($, run, r => {
      if (r === null) return r
      // Each question's line, newest first, gets its answer; one left unanswered says so.
      const log = [...r.log]
      for (const q of questions) {
        const i = log.findLastIndex(l => l.kind === 'ask' && l.text === q && l.detail === null)
        const entry = log[i]
        if (entry) log[i] = { ...entry, detail: answers[q] ?? '답 없음' }
      }
      return onAnswer({ ...r, log }, t)
    })
    await update($, now, () => t)
    return result
  }).catch(($, e, next) => next(e))

  // A write to the run sheet is the run's own account: read it back once written.
  // Any other file edit right after the confirm is make-it begun without its skill.
  on('tool.call', { tool: ['Edit', 'Write', 'NotebookEdit'] }, async ($, e, next) => {
    if (e.agentId !== undefined || (await read($, run)) === null) return next(e)
    const path = 'file_path' in e ? e.file_path : undefined
    if (path !== undefined && isSheetPath(path)) {
      // The run named its own sheet (no path was handed to it, or it kept an older one): follow it.
      await update($, run, r => (r === null || r.sheetPath === path ? r : { ...r, sheetPath: path }))
      sheetSeen = -1
      return next(e)
    }
    const t = await $.clock.now()
    await update($, run, r => (r === null ? r : onEdit(r, t)))
    const result = await next(e)
    if (path !== undefined && !('deny' in result && result.deny !== undefined)) {
      const isNew = field(resultOf(result), 'type') === 'create'
      const name = path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
      await update($, run, r => (r === null ? r : addLog(r, { at: t, kind: 'edit', text: name, detail: null, isOk: isNew })))
    }
    return result
  }).catch(($, e, next) => next(e))

  // A shell command that runs tests: its result goes in the log, with the counts it printed.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const runner = testOf(e.command)
    if (e.agentId !== undefined || runner === null || (await read($, run)) === null) return next(e)
    const result = await next(e)
    const t = await $.clock.now()
    const done = resultOf(result)
    const out = `${String(field(done, 'stdout') ?? '')}\n${String(field(done, 'stderr') ?? '')}`
    const isOk = done !== undefined && !('isError' in result && result.isError === true) && field(done, 'interrupted') !== true
    await update($, run, r => (r === null ? r : addLog(r, { at: t, kind: 'test', text: runner, detail: testCounts(out), isOk })))
    return result
  }).catch(($, e, next) => next(e))

  // Whatever tool wrote it (Bash, Write, a script), the sheet changes only under a tool call:
  // look at its modification time once each main-thread call has run.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) await checkSheet($)
    return result
  }).catch(($, e, next) => next(e))

  // The person's close (its mark, ctrl+x x, Esc) as much as the button's.
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) await update($, isPaneOpen, () => false)
    return next(e)
  }).catch(($, e, next) => next(e))

  // One line over whatever the other bands draw: a dot per step, the step at hand, the signals,
  // and at the right edge, lined up with the band's beneath, the pane's button and ×.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const r = await read($, run)
    if (r === null || e.props.hasSurvey) return below

    const isOpen = await read($, isPaneOpen)
    const { Box, Button, Text } = $.ui.resolve(e)
    const t = Math.max(await read($, now), r.startedAt)
    const steps = stepsOf(r)
    const dots = steps.map(({ state: s }) => <Text bold={LOUD[s]} color={COLOR[s]} dimColor={s === 'todo'}>{DOT[s]}</Text>)
    const focus = focusOf(r)
    const ms = focus === null ? null : stepMs(r, focus.key, t)
    const at =
      focus === null ? (
        <Text>
          <Text bold color="success">끝</Text>
          <Text dimColor>{` · ${minutes((r.doneAt ?? t) - r.startedAt)}`}</Text>
        </Text>
      ) : focus.state === 'todo' ? (
        <Text dimColor>{`다음 ${focus.key} ${focus.index + 1}/${steps.length}`}</Text>
      ) : (
        <Text>
          <Text bold color={COLOR[focus.state]}>{stepLabel(focus.key, focus.state)}</Text>
          <Text dimColor>
            {focus.state === 'run' ? ` ${focus.index + 1}/${steps.length}` : ''}
            {ms === null ? '' : ` · ${minutes(ms)}`}
          </Text>
        </Text>
      )
    const signals = signalSummary(r)
    const line = (
      <Box flexDirection="row" justifyContent="space-between" paddingLeft={LEFT} paddingRight={RIGHT}>
        <Text wrap="truncate-end">
          <Text bold>thegraph</Text>
          {r.label !== null && <Text dimColor>{` ${r.label}`}</Text>}
          <Text>{'  '}</Text>
          {dots}
          <Text>{'  '}</Text>
          {at}
          {signals !== '' && <Text color="magenta">{`   ⚑ ${signals}`}</Text>}
        </Text>
        <Box flexDirection="row" flexShrink={0}>
          <Text>{'  '}</Text>
          <Button key="pane" variant="primary" hotkey="g" onPress={() => togglePane($)}>
            {isOpen ? '▾ 패널 닫기' : '▸ 패널'}
          </Button>
          <Text> </Text>
          <Button key="dismiss" role="dismiss" hotkey="x" dimColor onPress={() => dismiss($)}>
            ×
          </Button>
          {/* The main screen reports no clicks: name the keys that press them there (ctrl+x tab focuses the band). */}
          {e.viewport?.isFullscreen === false && <Text dimColor> ^x⇥ g·x</Text>}
        </Box>
      </Box>
    )
    return (
      <Box flexDirection="column">
        {line}
        {below}
      </Box>
    )
  })

  // The log: a header, then what happened, oldest first, the engine following its end.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const r = await read($, run)
    // The pane's own way out: the band's button goes with the run, and /clear takes the run.
    const close = (
      <Box flexDirection="row" flexShrink={0}>
        <Text> </Text>
        <Button key="close" role="dismiss" hotkey="q" dimColor onPress={() => shutPane($)}>
          닫기
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
    const lines = r.log.map(l => {
      const at = `+${String(Math.floor((l.at - r.startedAt) / 60_000)).padStart(2)}m `
      return (
        <Text wrap="wrap">
          <Text dimColor>{at}</Text>
          {l.kind === 'step' && <Text bold>{`▸ ${l.text}`}</Text>}
          {l.kind === 'ask' && (
            <Text>
              <Text color="warning">◆ </Text>
              <Text>{l.text}</Text>
              {l.detail === null ? <Text color="warning">  …대기</Text> : <Text dimColor> → </Text>}
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
          {l.kind === 'end' && <Text bold color="success">✓ 끝</Text>}
        </Text>
      )
    })
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text wrap="truncate-end">
            <Text bold>thegraph</Text>
            {r.label !== null && <Text dimColor>{` ${r.label}`}</Text>}
            {route !== null && <Text color="cyan">{` · ${route}`}</Text>}
            <Text dimColor>{` · ${minutes((r.doneAt ?? t) - r.startedAt)}`}</Text>
            {isDone(r) && <Text color="success"> · 끝</Text>}
          </Text>
          {close}
        </Box>
        {r.sheet?.issue != null && <Text dimColor wrap="wrap">{r.sheet.issue}</Text>}
        <Text dimColor>{'─'.repeat(Math.max(8, Math.min(40, e.props.bodyColumns)))}</Text>
        {lines.length === 0 ? <Text dimColor>아직 기록이 없어요.</Text> : lines}
      </Box>
    )
  })
}
