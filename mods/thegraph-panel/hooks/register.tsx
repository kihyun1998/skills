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

const tick = async ($: EngineInterface) => {
  const r = await read($, run)
  if (r !== null && r.doneAt === null) {
    const t = await $.clock.now()
    await update($, now, () => t)
  }
}

// This plugin's own ui.close hook does not run under its own call, so the flag is cleared here.
const closePane = async ($: EngineInterface) => {
  if (await read($, isPaneOpen)) {
    await $.ui.close({ id: PANE })
    await update($, isPaneOpen, () => false)
  }
}

const togglePane = async ($: EngineInterface) => {
  if (await read($, isPaneOpen)) {
    await closePane($)
    return
  }
  const opened = await $.ui.open({ id: PANE, title: 'thegraph' })
  await update($, isPaneOpen, () => true)
  if (!opened.isPlaced) $.ui.toast(`thegraph: the pane waits (${opened.reason})`)
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
  await update($, run, r => (r === null ? r : { ...r, sheet }))
}

// The person gave the run up: the line goes, and the pane with it.
const dismiss = async ($: EngineInterface) => {
  await closePane($)
  await update($, run, () => null)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
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
      await update($, run, () => startRun(pendingLabel, t))
      pendingLabel = null
    } else if ((await read($, run)) !== null) {
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
    await update($, run, r => (r === null ? r : onTurnEnd(r, asked)))
    const result = await next(e)
    const t = await $.clock.now()
    await update($, run, r => (r === null ? r : onAnswer(r, t)))
    await update($, now, () => t)
    return result
  }).catch(($, e, next) => next(e))

  // A write to the run sheet is the run's own account: read it back once written.
  // Any other file edit right after the confirm is make-it begun without its skill.
  on('tool.call', { tool: ['Edit', 'Write', 'NotebookEdit'] }, async ($, e, next) => {
    if (e.agentId !== undefined || (await read($, run)) === null) return next(e)
    const path = 'file_path' in e ? e.file_path : undefined
    if (path !== undefined && isSheetPath(path)) {
      const result = await next(e)
      await readSheet($, path)
      return result
    }
    const t = await $.clock.now()
    await update($, run, r => (r === null ? r : onEdit(r, t)))
    return next(e)
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

  // The checklist: each step with its minutes, the route, and the signals as they fired.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const r = await read($, run)
    if (r === null) {
      return <Text dimColor>thegraph is not running.</Text>
    }
    const t = Math.max(await read($, now), r.startedAt)
    const end = r.doneAt ?? t
    const notes = r.sheet?.steps ?? []
    const rows = stepsOf(r).map(({ key, state: s }, i) => {
      const ms = stepMs(r, key, t)
      const note = notes[i]?.note
      return (
        <Box flexDirection="column">
          <Text>
            <Text color={COLOR[s]} bold={LOUD[s]} dimColor={s === 'todo'}>{`[${MARK[s] || ' '}] ${stepLabel(key, s).padEnd(12)}`}</Text>
            {ms !== null && <Text dimColor={s === 'done'}>{minutes(ms).padStart(5)}</Text>}
          </Text>
          {note != null && <Text dimColor wrap="wrap">{`    → ${note}`}</Text>}
        </Box>
      )
    })
    const route = r.sheet?.route ?? (r.route === null ? null : routeName(r.route))
    const carried = r.sheet?.carried ?? []
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold>thegraph</Text>
          {r.label !== null && <Text dimColor>{`  ${r.label}`}</Text>}
        </Text>
        {r.sheet?.issue != null && <Text dimColor wrap="truncate-end">{r.sheet.issue}</Text>}
        <Text dimColor>{'─'.repeat(24)}</Text>
        {rows}
        <Text> </Text>
        <Text>
          <Text dimColor>route  </Text>
          {route === null ? <Text dimColor>아직</Text> : <Text bold color="cyan">{route}</Text>}
        </Text>
        <Text>
          <Text dimColor>경과   </Text>
          <Text>{minutes(end - r.startedAt)}</Text>
          {isDone(r) && <Text color="success"> · 끝</Text>}
        </Text>
        <Text> </Text>
        {carried.length > 0 && <Text dimColor>넘길 것</Text>}
        {carried.map(c => (
          <Text wrap="wrap">{`  · ${c}`}</Text>
        ))}
        {carried.length > 0 && <Text> </Text>}
        <Text dimColor>신호</Text>
        {r.signals.length === 0 ? (
          <Text dimColor>  없음</Text>
        ) : (
          r.signals.map(s => (
            <Text>
              <Text dimColor>{`  +${minutes(s.at - r.startedAt).padEnd(4)} `}</Text>
              <Text color="magenta">{`⚑ ${s.skill}`}</Text>
            </Text>
          ))
        )}
      </Box>
    )
  })
}
