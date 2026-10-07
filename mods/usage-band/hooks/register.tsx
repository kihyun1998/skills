import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMeasureInput, SessionUsage } from 'claude-code'

import type { Live } from '../types'
import {
  TODAY_LOUD_USD,
  contextUsed,
  DIAL,
  FIGURE_COLOR,
  dialDelayMs,
  effortColor,
  isBurnHot,
  isLoud,
  isTodayUnpriced,
  levelOf,
  modelLabel,
  parseBurn,
  pieFigure,
  parseToday,
  resetIn,
  sinceArg,
  trendOf,
  usd,
} from './format'

const live = atom({ plugin: 'usage-band', key: 'live' } as const, null)
const effort = atom({ plugin: 'usage-band', key: 'effort' } as const, null)
const ledger = atom({ plugin: 'usage-band', key: 'ledger' } as const, null)
const burns = atom({ plugin: 'usage-band', key: 'burns' } as const, [])
const spin = atom({ plugin: 'usage-band', key: 'spin' } as const, 0)

/** How often ccusage is asked between turns. */
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

const refreshLive = async ($: EngineInterface, figures?: Figures) => {
  const model = await $.session.model()
  const u = figures ?? (await $.session.usage())
  await update($, live, () => toLive(model, u))
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

const askLedger = async ($: EngineInterface) => {
  const now = await $.clock.now()
  if (isAsking || now - lastAsk < LEDGER_GAP_MS) return
  isAsking = true
  lastAsk = now
  try {
    const [blocks, daily] = await Promise.all([
      ccusage($, ['blocks', '--active', '--json', '--offline']),
      ccusage($, ['daily', '--json', '--offline', '--since', sinceArg(now)]),
    ])
    const burn = parsed(blocks, parseBurn)
    await update($, ledger, () => ({ burnPerHour: burn, today: parsed(daily, parseToday) }))
    if (burn !== null) {
      await update($, burns, prev => [...prev, burn].slice(-60))
    }
  } finally {
    isAsking = false
  }
}

// Turns the dial a quarter and schedules the next turn at the current burn rate's pace.
const turnDial = async ($: EngineInterface) => {
  const burn = (await read($, ledger))?.burnPerHour ?? 0
  if (burn > 0) {
    await update($, spin, frame => (frame + 1) % DIAL.length)
  }
  $.clock.after(burn > 0 ? dialDelayMs(burn) : 2000, () => void turnDial($))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refreshLive($)
    // Off the start's path: ccusage takes about a second and the first prompt need not wait.
    $.clock.after(0, () => void askLedger($))
    $.clock.every(LEDGER_MS, () => void askLedger($))
    $.clock.after(0, () => void turnDial($))
    return result
  })

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

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const l = await read($, live)
    if (e.props.hasSurvey || l === null) {
      return next(e)
    }

    const eff = await read($, effort)
    const led = await read($, ledger)
    const readings = await read($, burns)
    const now = await $.clock.now()
    const { Text } = $.ui.resolve(e)

    // Labels dim, values in their own color; past 80% a value takes the theme's warning or error.
    const figure = (label: string, used: number, value: string, color: string, tail = '') => (
      <Text>
        <Text dimColor>{label} </Text>
        <Text color={isLoud(used) ? levelOf(used) : color}>{value}</Text>
        {tail !== '' && <Text dimColor>{tail}</Text>}
      </Text>
    )

    const parts: JSX.Element[] = [
      <Text>
        <Text bold color={FIGURE_COLOR.model}>{modelLabel(l.model)}</Text>
        {eff !== null && <Text bold color={effortColor(eff)}> {eff}</Text>}
      </Text>,
    ]

    const ctx = contextUsed(l.context)
    parts.push(figure('context', ctx, pieFigure(ctx), FIGURE_COLOR.context))

    const five = l.rateLimits.find(r => r.kind === 'five_hour')
    if (five) {
      const reset = isLoud(five.percentUsed) ? resetIn(five.resetsAt, now) : null
      parts.push(figure('5h', five.percentUsed, pieFigure(five.percentUsed), FIGURE_COLOR.fiveHour, reset ? ` · resets ${reset}` : ''))
    }

    const seven = l.rateLimits.find(r => r.kind === 'seven_day')
    if (seven) {
      parts.push(figure('week', seven.percentUsed, pieFigure(seven.percentUsed), FIGURE_COLOR.week))
    }

    if (led?.burnPerHour != null) {
      const rate = isBurnHot(led.burnPerHour, readings) ? 'error' : FIGURE_COLOR.burn
      const frame = await read($, spin)
      const trend = trendOf(readings)
      parts.push(
        <Text>
          <Text bold color={rate}>{DIAL[frame % DIAL.length]}</Text>
          <Text color={rate}>{` ${usd(led.burnPerHour)}/h`}</Text>
          {trend && (
            <Text bold color={trend.tone === 'up' ? 'redBright' : trend.tone === 'down' ? 'green' : undefined} dimColor={trend.tone === 'flat'}>
              {` ${trend.arrow}`}
            </Text>
          )}
        </Text>,
      )
    }

    if (led?.today != null) {
      parts.push(
        isTodayUnpriced(led, l) ? (
          <Text color="warning">today $0 · model not priced in ccusage</Text>
        ) : (
          <Text>
            <Text dimColor>today </Text>
            <Text bold={led.today >= TODAY_LOUD_USD} color={FIGURE_COLOR.today}>{usd(led.today)}</Text>
          </Text>
        ),
      )
    }

    const line: JSX.Element[] = []
    parts.forEach((p, i) => {
      if (i > 0) line.push(<Text dimColor>{'  ·  '}</Text>)
      line.push(p)
    })

    return <Text wrap="truncate-end">{line}</Text>
  })
}
