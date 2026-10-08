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
  effortFromSettings,
  evenPace,
  fiveHourRate,
  gaugeCells,
  gaugeWidth,
  isLoud,
  isTodayUnpriced,
  levelOf,
  paceLevel,
  paceOf,
  modelLabel,
  parseBurn,
  parseToday,
  recordFive,
  runsOutAt,
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

/** Cells for a gauge's label (`ctx `, `5h  `), and the divider between two columns. */
const GAUGE_LABEL = 4
const DIVIDER = '  │  '

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

  // A compaction empties the window, which no measurement reports until the next response.
  // A precompute leaves the conversation as it is, and a subagent's compacts only its own.
  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (result.skip === undefined && e.trigger !== 'precompute' && e.agentId === undefined) {
      await refreshLive($)
    }
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

  // Three columns, divided, each a head over its gauge: context (the model, its effort, the cache),
  // the 5-hour window (its pace or when it runs out, and its reset), and the week with the money.
  // Quiet until something needs saying: colour is kept for a limit past 80%, a pace that runs
  // out, a cold cache and a heavy day.
  // Whatever other bands draw goes above, so these rows stay next to the prompt whichever hook runs first.
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

    // A piece of a row: its text and how it is drawn.
    type Seg = { text: string; color?: string; bold?: boolean; dim?: boolean }
    const draw = (segs: Seg[]) => segs.map(g => <Text color={g.color} bold={g.bold} dimColor={g.dim}>{g.text}</Text>)
    // A column's head, cut or padded to the gauge's width so the dividers line up.
    const fit = (segs: Seg[], n: number): Seg[] => {
      const out: Seg[] = []
      let used = 0
      for (const g of segs) {
        const take = [...g.text].slice(0, Math.max(0, n - used)).join('')
        if (take !== '') out.push({ ...g, text: take })
        used += [...take].length
      }
      return used < n ? [...out, { text: ' '.repeat(n - used) }] : out
    }
    const dot: Seg = { text: ' · ', dim: true }

    // The heads.
    const hit = cacheHit(await read($, cacheReadings))
    const contextHead: Seg[] = [
      { text: modelLabel(l.model), color: FIGURE_COLOR.model, bold: true },
      ...(eff !== null ? [{ text: ` ${eff}`, dim: true }] : []),
      ...(hit !== null ? [dot, { text: 'cache ', dim: true }, { text: `${hit}%`, color: hit >= 80 ? undefined : cacheLevel(hit) }] : []),
    ]
    const five = fiveOf(l)
    const rate = five ? fiveHourRate(samples, five.percentUsed, five.resetsAt, now) : null
    const outAt = five && rate !== null ? runsOutAt(rate, five.percentUsed, five.resetsAt, now) : null
    // Pieces of a head, a dot between those that say something.
    const join = (...parts: Seg[][]): Seg[] => parts.filter(p => p.length > 0).flatMap((p, i) => (i === 0 ? p : [dot, ...p]))
    // A limit's pace leads its head: the share used over the share of its window gone, quiet up to 80%.
    const pace = (used: number, resetsAt: string | null, windowMs: number): Seg[] => {
      const p = paceOf(used, resetsAt, windowMs, now)
      if (p === null) return []
      const lv = paceLevel(p)
      return [{ text: `${p}% pace`, bold: true, ...(lv === 'success' ? {} : { color: lv }) }]
    }
    const fiveHead: Seg[] | null =
      five === undefined ? null
      : join(
          pace(five.percentUsed, five.resetsAt, WINDOW_MS.fiveHour),
          outAt !== null ? [{ text: `out at ${clockOf(outAt)}`, color: 'error', bold: true }] : [],
          five.resetsAt != null ? [{ text: `resets ${clockOf(Date.parse(five.resetsAt))}`, dim: true }] : [],
        )
    const moneyHead: Seg[] = [
      ...(led?.today == null ? []
        : isTodayUnpriced(led, l) ? [{ text: 'today $0 · model not priced in ccusage', color: 'warning' }]
        : [{ text: 'today ', dim: true }, { text: usd(led.today), ...(led.today >= TODAY_LOUD_USD ? { color: 'warning', bold: true } : {}) }]),
      ...(led?.burnPerHour != null ? [...(led.today == null ? [] : [dot]), { text: `${usd(led.burnPerHour)}/h`, dim: five !== undefined }] : []),
    ]

    // The gauges, each limit's carrying its even-pace mark when its reset time is known.
    const seven = l.rateLimits.find(r => r.kind === 'seven_day')
    const gauges = [
      { label: 'ctx', used: contextUsed(l.context), mark: null as number | null, head: contextHead },
      ...(five ? [{ label: '5h', used: five.percentUsed, mark: evenPace(five.resetsAt, WINDOW_MS.fiveHour, now), head: fiveHead ?? [] }] : []),
      ...(seven ? [{ label: 'wk', used: seven.percentUsed, mark: evenPace(seven.resetsAt, WINDOW_MS.week, now), head: pace(seven.percentUsed, seven.resetsAt, WINDOW_MS.week) }] : []),
    ]
    // The money goes after the last head: the week's pace, or whatever column comes last.
    const last = gauges[gauges.length - 1]
    if (last) last.head = join(last.head, moneyHead)

    const each = gaugeWidth(e.props.bodyColumns - LEFT - RIGHT, gauges.length, DIVIDER.length)
    const divider = <Text dimColor>{DIVIDER}</Text>
    const top = (
      <Text wrap="truncate-end">
        {gauges.map((g, i) => (
          <Text>
            {i > 0 && divider}
            {draw(fit(g.head, each))}
          </Text>
        ))}
      </Text>
    )
    const bottom = (
      <Text wrap="truncate-end">
        {gauges.map((g, i) => {
          const figure = ` ${String(g.used).padStart(3)}%`
          const cells = gaugeCells(Math.max(4, each - GAUGE_LABEL - figure.length), g.used, g.mark)
          const loud = isLoud(g.used) ? levelOf(g.used) : undefined
          return (
            <Text>
              {i > 0 && divider}
              <Text dimColor>{g.label.padEnd(GAUGE_LABEL)}</Text>
              {cells.map(c => (c === 'mark' ? <Text bold>┊</Text> : c === 'fill' ? <Text color={loud}>━</Text> : <Text dimColor>─</Text>))}
              <Text bold color={loud}>{figure}</Text>
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
