import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMeasureInput, SessionUsage } from 'claude-code'

import type { Live } from '../types'
import {
  FIGURE_COLOR,
  TODAY_LOUD_USD,
  contextUsed,
  effortColor,
  effortFromSettings,
  fiveHourRate,
  isLoud,
  isTodayUnpriced,
  levelOf,
  modelLabel,
  parseBurn,
  parseToday,
  pieFigure,
  rateLevel,
  recordFive,
  resetIn,
  runwayColor,
  sinceArg,
  usd,
} from './format'

const live = atom({ plugin: 'usage-band', key: 'live' } as const, null)
const effort = atom({ plugin: 'usage-band', key: 'effort' } as const, null)
const ledger = atom({ plugin: 'usage-band', key: 'ledger' } as const, null)
const fiveSamples = atom({ plugin: 'usage-band', key: 'fiveSamples' } as const, [])

/** Blank cells at the band's left, so its text lines up with the turn line's after `✻ `; and at its right. */
const LEFT = 2
const RIGHT = 1

/** How often ccusage is asked between turns; each answer also redraws, so %/h decays while idle. */
const LEDGER_MS = 120_000
/** A turn's measurement asks again only once this long has passed since the last ask. */
const LEDGER_GAP_MS = 30_000

// No shell runs the argv: on Windows `ccusage` is a .cmd shim that only cmd.exe starts.
const LAUNCHERS: readonly (readonly string[])[] = [['ccusage'], ['cmd', '/c', 'ccusage']]

type Figures = Pick<SessionUsage, 'context' | 'rateLimits' | 'cost'> | SessionMeasureInput

const toLive = (model: string, u: Figures): Live => ({
  model,
  context: {
    tokens: u.context.tokens ?? null,
    window: u.context.window,
    percent: u.context.percent ?? null,
  },
  rateLimits: u.rateLimits.map(r => ({
    kind: r.kind,
    percentUsed: r.percentUsed,
    resetsAt: r.resetsAt ?? null,
  })),
  usd: u.cost?.usd ?? null,
})

const fiveOf = (l: Live | null) => l?.rateLimits.find(r => r.kind === 'five_hour')

// Takes a reading, and adds the 5-hour window's to its history for %/h.
const refreshLive = async ($: EngineInterface, figures?: Figures) => {
  const model = await $.session.model()
  const u = figures ?? (await $.session.usage())
  const next = toLive(model, u)
  const previous = fiveOf(await read($, live))
  const five = fiveOf(next)
  if (five) {
    const now = await $.clock.now()
    await update($, fiveSamples, samples =>
      recordFive(samples, five.percentUsed, five.resetsAt, previous?.resetsAt ?? five.resetsAt, now),
    )
  }
  await update($, live, () => next)
}

// Module state: a reload starts these over, which costs one extra ccusage run.
let launcher: readonly string[] | null = null
let lastAsk = -Infinity
let isAsking = false

const ccusage = async ($: EngineInterface, args: readonly string[]): Promise<string | null> => {
  for (const l of launcher ? [launcher] : LAUNCHERS) {
    try {
      const r = await $.process.run([...l, ...args], { timeoutMs: 20_000 })
      if (r.exitCode === 0) {
        launcher = l
        return r.stdout
      }
    } catch {
      // This launcher cannot start here; try the next.
    }
  }
  return null
}

const parsed = <T,>(stdout: string | null, parse: (s: string) => T): T | null => {
  if (stdout === null) return null
  try {
    return parse(stdout)
  } catch {
    return null
  }
}

const askLedger = async ($: EngineInterface, isForced = false) => {
  const now = await $.clock.now()
  if (isAsking || (!isForced && now - lastAsk < LEDGER_GAP_MS)) return
  isAsking = true
  lastAsk = now
  try {
    const [blocks, daily] = await Promise.all([
      ccusage($, ['blocks', '--active', '--json', '--offline']),
      ccusage($, ['daily', '--json', '--offline', '--since', sinceArg(now)]),
    ])
    await update($, ledger, () => ({ burnPerHour: parsed(blocks, parseBurn), today: parsed(daily, parseToday) }))
  } finally {
    isAsking = false
  }
}

// Until the first request says what effort it was sent with, show what settings name.
const seedEffort = async ($: EngineInterface) => {
  if ((await read($, effort)) !== null) return
  const l = await read($, live)
  if (l === null) return
  const fromSettings = effortFromSettings(await $.settings.read(), l.model)
  if (fromSettings !== null) await update($, effort, () => fromSettings)
}

// Everything the band shows, read again: at start, and after /clear, /resume or /branch
// reset $.state, which session.start does not follow.
const fill = async ($: EngineInterface, isForced: boolean) => {
  await refreshLive($)
  await seedEffort($)
  await askLedger($, isForced)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refreshLive($)
    await seedEffort($)
    // Off the start's path: ccusage takes about a second and the first prompt need not wait.
    $.clock.after(0, () => void askLedger($))
    $.clock.every(LEDGER_MS, () => void askLedger($))
    return result
  })

  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    const result = await next(e)
    await fill($, true)
    return result
  }).catch(($, e, next) => next(e))

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await refreshLive($, e)
    await askLedger($)
    return result
  })

  on('classic.PostModelSwitch', async ($, e, next) => {
    await update($, live, prev => (prev === null ? null : { ...prev, model: e.to_model }))
    return next(e)
  }).catch(($, e, next) => next(e))

  // The effort a main-thread request is actually sent with, after any downgrade for the model.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const sent = e.effort === undefined ? null : String(e.effort)
      if ((await read($, effort)) !== sent) {
        await update($, effort, () => sent)
      }
    }
    return yield* next(e)
  })

  // Two rows: who and how fast on top, then the context runway with the limits after it.
  // Whatever other bands draw goes above them, so these two stay next to the prompt
  // whichever plugin's hook runs first.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const l = await read($, live)
    if (e.props.hasSurvey || l === null) {
      return below
    }

    const eff = await read($, effort)
    const led = await read($, ledger)
    const samples = await read($, fiveSamples)
    const now = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)
    const gap = <Text>{'   '}</Text>

    // Top row: model and effort, %/h of the 5-hour limit (or $/h without one), today.
    const five = fiveOf(l)
    const rate = five ? fiveHourRate(samples, five.percentUsed, five.resetsAt, now) : null
    const pace =
      five && rate !== null ? (
        <Text>
          <Text bold color={rateLevel(rate, five.percentUsed, five.resetsAt, now)}>{`+${Math.round(rate)}%/h`}</Text>
          {led?.burnPerHour != null && <Text dimColor>{` ${usd(led.burnPerHour)}/h`}</Text>}
        </Text>
      ) : led?.burnPerHour != null ? (
        <Text bold color={FIGURE_COLOR.burn}>{`${usd(led.burnPerHour)}/h`}</Text>
      ) : null
    const today =
      led?.today == null ? null : isTodayUnpriced(led, l) ? (
        <Text color="warning">today $0 · model not priced in ccusage</Text>
      ) : (
        <Text>
          <Text dimColor>today </Text>
          <Text bold={led.today >= TODAY_LOUD_USD} color={FIGURE_COLOR.today}>{usd(led.today)}</Text>
        </Text>
      )
    const top = (
      <Text wrap="truncate-end">
        <Text bold color={FIGURE_COLOR.model}>{modelLabel(l.model)}</Text>
        {eff !== null && <Text bold color={effortColor(eff)}>{` ${eff}`}</Text>}
        {pace && gap}
        {pace}
        {today && gap}
        {today}
      </Text>
    )

    // Bottom row: the runway fills with context, then the figures it leaves room for.
    const ctx = contextUsed(l.context)
    const seven = l.rateLimits.find(r => r.kind === 'seven_day')
    const fiveReset = five && isLoud(five.percentUsed) ? resetIn(five.resetsAt, now) : null
    const tailText = [
      ` ${ctx}% ctx`,
      five ? `   5h ${pieFigure(five.percentUsed)}${fiveReset ? ` · resets ${fiveReset}` : ''}` : '',
      seven ? `  wk ${pieFigure(seven.percentUsed)}` : '',
    ].join('')
    const width = Math.max(10, e.props.bodyColumns - LEFT - RIGHT - [...tailText].length)
    const filled = Math.round((ctx / 100) * width)
    const cells: JSX.Element[] = []
    for (let i = 0; i < width; i++) {
      cells.push(i < filled ? <Text color={runwayColor(i, width)}>━</Text> : <Text dimColor>─</Text>)
    }
    const bottom = (
      <Text wrap="truncate-end">
        {cells}
        <Text bold color={isLoud(ctx) ? levelOf(ctx) : FIGURE_COLOR.context}>{` ${ctx}%`}</Text>
        <Text dimColor> ctx</Text>
        {five && <Text dimColor>{'   5h '}</Text>}
        {five && <Text bold color={isLoud(five.percentUsed) ? levelOf(five.percentUsed) : FIGURE_COLOR.fiveHour}>{pieFigure(five.percentUsed)}</Text>}
        {fiveReset && <Text dimColor>{` · resets ${fiveReset}`}</Text>}
        {seven && <Text dimColor>{'  wk '}</Text>}
        {seven && <Text bold color={isLoud(seven.percentUsed) ? levelOf(seven.percentUsed) : FIGURE_COLOR.week}>{pieFigure(seven.percentUsed)}</Text>}
      </Text>
    )

    return (
      <Box flexDirection="column">
        {below}
        <Box flexDirection="column" paddingLeft={LEFT} paddingRight={RIGHT}>
          {top}
          {bottom}
        </Box>
      </Box>
    )
  })
}
