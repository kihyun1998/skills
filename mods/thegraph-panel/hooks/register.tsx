import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { labelOf, minutes, onAnswer, onSkill, onTurnEnd, plan, routeName, signalSummary, startRun, stateOf, stepLabel, stepMs } from './run'
import type { StepState } from './run'

const run = atom({ plugin: 'thegraph-panel', key: 'run' } as const, null)
const isPaneOpen = atom({ plugin: 'thegraph-panel', key: 'isPaneOpen' } as const, false)
const now = atom({ plugin: 'thegraph-panel', key: 'now' } as const, 0)

const PANE = 'thegraph'
/** Blank cells at the line's left, as usage-band keeps, so both line up under the turn line. */
const LEFT = 2
/** A running step's minutes redraw this often while nothing else happens. */
const TICK_MS = 30_000

const MARK: Record<StepState, string> = { done: '✓', run: '◉', wait: '◆', todo: '' }
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

  // The person's close (its mark, ctrl+x x, Esc) as much as the button's.
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) await update($, isPaneOpen, () => false)
    return next(e)
  }).catch(($, e, next) => next(e))

  // One line over whatever the other bands draw: the steps, the signals, the pane's button.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const r = await read($, run)
    if (r === null || e.props.hasSurvey) return below

    const isOpen = await read($, isPaneOpen)
    const { Box, Button, Text } = $.ui.resolve(e)
    const keys = plan(r.route)
    const steps = keys.map((key, i) => {
      const s = stateOf(r, key)
      const name = stepLabel(key, s)
      return (
        <Text>
          {i > 0 && <Text dimColor> › </Text>}
          <Text bold={LOUD[s]} color={COLOR[s]} dimColor={s === 'todo'}>
            {s === 'todo' ? name : `${MARK[s]} ${name}`}
          </Text>
        </Text>
      )
    })
    const signals = signalSummary(r)
    const line = (
      <Box flexDirection="row" paddingLeft={LEFT}>
        <Text wrap="truncate-end">
          <Text bold>thegraph</Text>
          {r.label !== null && <Text dimColor>{` ${r.label}`}</Text>}
          <Text>{'   '}</Text>
          {steps}
          {r.doneAt !== null && <Text bold color="success">{`  끝 ${minutes(r.doneAt - r.startedAt)}`}</Text>}
          {signals !== '' && <Text color="magenta">{`   ⚑ ${signals}`}</Text>}
          <Text>{'  '}</Text>
        </Text>
        <Button key="pane" variant="primary" hotkey="g" onPress={() => togglePane($)}>
          {isOpen ? '▾ 패널 닫기' : '▸ 패널'}
        </Button>
        <Text> </Text>
        <Button key="dismiss" role="dismiss" hotkey="x" dimColor onPress={() => dismiss($)}>
          ×
        </Button>
        {/* The main screen reports no clicks: say which keys press them there. */}
        {e.viewport?.isFullscreen === false && <Text dimColor> ctrl+x tab → g 패널 · x 치우기</Text>}
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
    const rows = plan(r.route).map(key => {
      const s = stateOf(r, key)
      const ms = stepMs(r, key, t)
      return (
        <Text>
          <Text color={COLOR[s]} bold={LOUD[s]} dimColor={s === 'todo'}>{`[${MARK[s] || ' '}] ${stepLabel(key, s).padEnd(12)}`}</Text>
          {ms !== null && <Text dimColor={s === 'done'}>{minutes(ms).padStart(5)}</Text>}
        </Text>
      )
    })
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold>thegraph</Text>
          {r.label !== null && <Text dimColor>{`  ${r.label}`}</Text>}
        </Text>
        <Text dimColor>{'─'.repeat(24)}</Text>
        {rows}
        <Text> </Text>
        <Text>
          <Text dimColor>route  </Text>
          {r.route === null ? <Text dimColor>아직</Text> : <Text bold color="cyan">{routeName(r.route)}</Text>}
        </Text>
        <Text>
          <Text dimColor>경과   </Text>
          <Text>{minutes(end - r.startedAt)}</Text>
          {r.doneAt !== null && <Text color="success"> · 끝</Text>}
        </Text>
        <Text> </Text>
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
