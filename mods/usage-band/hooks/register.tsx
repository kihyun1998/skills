import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMeasureInput, SessionUsage } from 'claude-code'

import type { Live } from '../types'
import {
  CACHE_READINGS,
  FIGURE_COLOR,
  WINDOW_MS,
  cacheHit,
  cacheLevel,
  clockOf,
  TODAY_LOUD_USD,
  contextUsed,
  effortColor,
  effortFromSettings,
  evenPace,
  fiveHourRate,
  gaugeCells,
  gaugeWidth,
  isLoud,
  isTodayUnpriced,
  levelOf,
  modelLabel,
  parseBurn,
  parseToday,
  rateLevel,
  recordFive,
  resetIn,
  runsOutAt,
  runwayColor,
  sinceArg,
  usd,
} from './format'

const live = atom({ plugin: 'usage-band', key: 'live' } as const, null)
const effort = atom({ plugin: 'usage-band', key: 'effort' } as const, null)
const ledger = atom({ plugin: 'usage-band', key: 'ledger' } as const, null)
const fiveSamples = atom({ plugin: 'usage-band', key: 'fiveSamples' } as const, [])
const cacheReadings = atom({ plugin: 'usage-band', key: 'cacheReadings' } as const, [])

/** Blank cells at the band's left, so its text lines up with the turn line's after `✻ `; and at its right. */
const LEFT = 2
const RIGHT = 1

/** Cells for a gauge's label (`ctx `, `5h  `), and between two gauges. */
const GAUGE_LABEL = 4
const GAUGE_GAP = 4

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

  // The effort a main-thread request is actually sent with, after any downgrade for the model,
  // and what the cache served of its prompt.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const sent = e.effort === undefined ? null : String(e.effort)
      if ((await read($, effort)) !== sent) {
        await update($, effort, () => sent)
      }
    }
    const result = yield* next(e)
    const usage = result.usage
    if (e.agentId === undefined && usage !== null) {
      const reading = { read: usage.cache_read_input_tokens, written: usage.cache_creation_input_tokens, uncached: usage.input_tokens }
      await update($, cacheReadings, list => [...list, reading].slice(-CACHE_READINGS))
    }
    return result
  })

  // Two rows: who and how fast on top, then a gauge each for context, the 5-hour window and the week.
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
    const outAt = five && rate !== null ? runsOutAt(rate, five.percentUsed, five.resetsAt, now) : null
    const pace =
      five && rate !== null && outAt !== null && five.resetsAt !== null ? (
        // At this pace the limit runs out before the reset: say when, and when it comes back.
        <Text>
          <Text bold color="error">{`${clockOf(outAt)} 바닥`}</Text>
          <Text dimColor>{` · 리셋 ${clockOf(Date.parse(five.resetsAt))}`}</Text>
        </Text>
      ) : five && rate !== null ? (
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
    const hit = cacheHit(await read($, cacheReadings))
    const cache =
      hit === null ? null : (
        <Text>
          <Text dimColor>캐시 </Text>
          <Text color={cacheLevel(hit)}>{`${hit}%`}</Text>
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
        {cache && gap}
        {cache}
      </Text>
    )

    // Bottom row: a gauge each for context, the 5-hour window and the week, side by side.
    // A limit's gauge carries its even-pace mark when its reset time is known: a bar past it is spending faster than time passes.
    const seven = l.rateLimits.find(r => r.kind === 'seven_day')
    const fiveReset = five && isLoud(five.percentUsed) ? resetIn(five.resetsAt, now) : null
    const gauges = [
      { label: 'ctx', used: contextUsed(l.context), color: FIGURE_COLOR.context, mark: null, after: '' },
      ...(five
        ? [{ label: '5h', used: five.percentUsed, color: FIGURE_COLOR.fiveHour, mark: evenPace(five.resetsAt, WINDOW_MS.fiveHour, now), after: fiveReset ? ` · resets ${fiveReset}` : '' }]
        : []),
      ...(seven ? [{ label: 'wk', used: seven.percentUsed, color: FIGURE_COLOR.week, mark: evenPace(seven.resetsAt, WINDOW_MS.week, now), after: '' }] : []),
    ]
    const room = e.props.bodyColumns - LEFT - RIGHT - gauges.reduce((n, g) => n + [...g.after].length, 0)
    const each = gaugeWidth(room, gauges.length, GAUGE_GAP)
    const bottom = (
      <Text wrap="truncate-end">
        {gauges.map((g, i) => {
          const figure = ` ${String(g.used).padStart(3)}%`
          const cells = gaugeCells(Math.max(4, each - GAUGE_LABEL - figure.length), g.used, g.mark)
          return (
            <Text>
              {i > 0 && <Text>{' '.repeat(GAUGE_GAP)}</Text>}
              <Text dimColor>{g.label.padEnd(GAUGE_LABEL)}</Text>
              {cells.map((c, j) =>
                c === 'mark' ? <Text bold>┊</Text> : c === 'fill' ? <Text color={runwayColor(j, cells.length)}>━</Text> : <Text dimColor>─</Text>,
              )}
              <Text bold color={isLoud(g.used) ? levelOf(g.used) : g.color}>{figure}</Text>
              {g.after !== '' && <Text dimColor>{g.after}</Text>}
            </Text>
          )
        })}
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
