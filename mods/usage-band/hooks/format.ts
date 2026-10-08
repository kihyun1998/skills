import type { FiveSample, Ledger, Live } from '../types'

export type Level = 'success' | 'warning' | 'error'

/** 80% warns, 90% is critical; below that a figure stays quiet. */
export const levelOf = (used: number): Level =>
  used >= 90 ? 'error' : used >= 80 ? 'warning' : 'success'

export const isLoud = (used: number): boolean => used >= 80

/** Percent of the context window used; 0 before the first response reports a fill. */
export const contextUsed = (context: Live['context']): number => {
  if (context.percent !== null) return context.percent
  if (context.tokens === null || context.window === 0) return 0
  return Math.round((context.tokens / context.window) * 100)
}

// `claude-haiku-4-5-20251001` → haiku 4.5; a trailing date or `[1m]` is not a minor version.
const MODEL_ID = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?!\d)/

export const modelLabel = (id: string): string => {
  const m = MODEL_ID.exec(id)
  if (!m || !m[1] || !m[2]) return id.toLowerCase()
  return `${m[1]} ${m[2]}${m[3] ? `.${m[3]}` : ''}`
}

// ANSI color names, not hex: the terminal paints them from its own palette, so the band follows its theme.
const EFFORT_COLOR: Record<string, string> = {
  low: 'gray',
  medium: 'blueBright',
  high: 'magentaBright',
  xhigh: 'redBright',
  max: 'red',
}

export const effortColor = (effort: string): string => EFFORT_COLOR[effort] ?? 'whiteBright'

/** Each figure's own color while it is quiet; past 80% the theme's warning and error take over. */
export const FIGURE_COLOR = {
  model: 'claude',
  context: 'green',
  fiveHour: 'cyan',
  week: 'blueBright',
  burn: 'yellow',
  today: 'magenta',
} as const

export const usd = (n: number): string => `$${n.toFixed(2)}`

/** `2h13m` until `resetsAt`, or null when it is unknown or past. */
export const resetIn = (resetsAt: string | null, now: number): string | null => {
  if (resetsAt === null) return null
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at) || at <= now) return null
  const mins = Math.ceil((at - now) / 60_000)
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}m`
}

/**
 * The effort settings name for a model, before any request has said what it was sent
 * with: `modelSettings[<model>].effortLevel`, else `effortLevel`. The model id's
 * trailing `[1m]` and the like are not part of the settings key.
 */
export const effortFromSettings = (settings: Readonly<Record<string, unknown>>, model: string): string | null => {
  const id = model.replace(/\[.*\]$/, '')
  const perModel = (settings.modelSettings as Record<string, { effortLevel?: unknown }> | undefined)?.[id]?.effortLevel
  const level = perModel ?? settings.effortLevel
  return typeof level === 'string' ? level : null
}

/** The figure today's cost is loud past. */
export const TODAY_LOUD_USD = 100

/** ccusage prices from a bundled table; a model missing from it costs $0, silently. */
export const isTodayUnpriced = (ledger: Ledger, live: Live): boolean =>
  ledger.today === 0 && (live.usd ?? 0) > 0

/** `ccusage blocks --active --json`: the active block's cost per hour. */
export const parseBurn = (stdout: string): number | null => {
  const blocks = (JSON.parse(stdout) as { blocks?: { isActive?: boolean; burnRate?: { costPerHour?: number } | null }[] }).blocks
  const active = blocks?.find(b => b.isActive)
  return active?.burnRate?.costPerHour ?? null
}

/**
 * `ccusage daily --json`: the latest day's total. The query starts a day back
 * (`sinceArg`) so no time zone's today is cut off; until today's first response
 * anywhere on this machine the latest day is still yesterday, a window this
 * accepts rather than guessing the local date in an environment with no zone.
 */
export const parseToday = (stdout: string): number | null => {
  const daily = (JSON.parse(stdout) as { daily?: { totalCost?: number }[] }).daily ?? []
  const last = daily.at(-1)
  return last ? (last.totalCost ?? 0) : null
}

/** `--since` for the daily query: yesterday in UTC, which no time zone's today precedes. */
export const sinceArg = (now: number): string =>
  new Date(now - 86_400_000).toISOString().slice(0, 10).replaceAll('-', '')

// --- the 5-hour window's pace ---------------------------------------------------

const HOUR = 3_600_000
const WINDOW = 5 * HOUR
/** The trailing stretch %/h is measured over. */
const TRAIL = HOUR
/** Below this much history, the window's own average stands in for the trailing rate. */
const MIN_SPAN = 15 * 60_000

/**
 * The window's history with one more reading: a new window (a later reset time, or
 * a fall in use) starts it over; an unchanged reading adds nothing.
 */
export const recordFive = (
  samples: readonly FiveSample[],
  percentUsed: number,
  resetsAt: string | null,
  previousResetsAt: string | null,
  now: number,
): FiveSample[] => {
  const last = samples.at(-1)
  const isNewWindow = resetsAt !== previousResetsAt || (last !== undefined && percentUsed < last.percentUsed)
  if (isNewWindow || last === undefined) return [{ at: now, percentUsed }]
  if (last.percentUsed === percentUsed) return [...samples]
  return [...samples.filter(x => now - x.at <= TRAIL + MIN_SPAN), { at: now, percentUsed }]
}

/**
 * How fast the 5-hour window is being used, in percent per hour: the rise over the
 * last hour, measured to now so an idle stretch brings it down. With under 15
 * minutes of history it is the window's average so far, which needs no history.
 * Null when neither can be told (no reset time, or the window only just began).
 */
export const fiveHourRate = (
  samples: readonly FiveSample[],
  percentUsed: number,
  resetsAt: string | null,
  now: number,
): number | null => {
  const base = samples.find(x => now - x.at <= TRAIL)
  if (base !== undefined && now - base.at >= MIN_SPAN) {
    return Math.max(0, ((percentUsed - base.percentUsed) / (now - base.at)) * HOUR)
  }
  if (resetsAt === null) return null
  const elapsed = now - (Date.parse(resetsAt) - WINDOW)
  if (Number.isNaN(elapsed) || elapsed < 10 * 60_000) return null
  return (percentUsed / elapsed) * HOUR
}

/**
 * Whether this pace reaches the limit before the window resets: error when it
 * does, warning past 80% of the pace that would, success below.
 */
export const rateLevel = (rate: number, percentUsed: number, resetsAt: string | null, now: number): Level => {
  if (resetsAt === null) return 'success'
  const hoursLeft = (Date.parse(resetsAt) - now) / HOUR
  if (!(hoursLeft > 0)) return 'success'
  const sustainable = (100 - percentUsed) / hoursLeft
  return rate > sustainable ? 'error' : rate > sustainable * 0.8 ? 'warning' : 'success'
}

/** How long each limit's window runs before it resets. */
export const WINDOW_MS = { fiveHour: WINDOW, week: 7 * 24 * HOUR } as const

/**
 * Where a limit's bar would end at an even pace: the share of its window already
 * gone, in percent. Null when the reset time is unknown or past.
 */
export const evenPace = (resetsAt: string | null, windowMs: number, now: number): number | null => {
  if (resetsAt === null) return null
  const left = Date.parse(resetsAt) - now
  if (!(left > 0)) return null
  return Math.min(100, Math.max(0, ((windowMs - left) / windowMs) * 100))
}

// --- the forecast and the cache -----------------------------------------------------

/**
 * When the 5-hour limit runs out at this pace, if that comes before the window
 * resets; null when it holds until the reset, or the pace or the reset is unknown.
 */
export const runsOutAt = (rate: number, percentUsed: number, resetsAt: string | null, now: number): number | null => {
  if (resetsAt === null || !(rate > 0)) return null
  const reset = Date.parse(resetsAt)
  if (!(reset > now)) return null
  const at = now + ((100 - percentUsed) / rate) * HOUR
  return at < reset ? at : null
}

/** `16:27`, the engine's local time of day. */
export const clockOf = (at: number): string => {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** The cache hit rate is taken over this many of the latest requests. */
export const CACHE_READINGS = 10

/** Percent of the prompt tokens the cache served over these requests; null before any request. */
export const cacheHit = (readings: readonly { read: number; written: number; uncached: number }[]): number | null => {
  const total = readings.reduce((n, r) => n + r.read + r.written + r.uncached, 0)
  if (total === 0) return null
  return Math.round((readings.reduce((n, r) => n + r.read, 0) / total) * 100)
}

/** A hit rate's colour: most of the prompt served from the cache is the healthy case. */
export const cacheLevel = (percent: number): Level => (percent >= 80 ? 'success' : percent >= 50 ? 'warning' : 'error')

// --- the gauges ------------------------------------------------------------------

/** What each cell of a gauge holds: used, not yet used, or the even-pace mark. */
export type GaugeCell = 'fill' | 'empty' | 'mark'

/** A gauge `width` cells long filled to `used`%, with the mark (when given) over whatever cell it lands on. */
export const gaugeCells = (width: number, used: number, mark: number | null): GaugeCell[] => {
  const filled = Math.round((Math.min(100, Math.max(0, used)) / 100) * width)
  const at = mark === null ? -1 : Math.min(width - 1, Math.round((mark / 100) * width))
  return Array.from({ length: width }, (_, i): GaugeCell => (i === at ? 'mark' : i < filled ? 'fill' : 'empty'))
}

/** The cells each of `count` gauges gets once `room` holds them and the gaps between them. */
export const gaugeWidth = (room: number, count: number, gap: number): number =>
  Math.floor((room - gap * (count - 1)) / count)


const RUNWAY_STOPS = ['#56b6c2', '#98c379', '#e5c07b', '#e06c75'] as const

/**
 * The color of each filled cell of a runway `width` cells long: teal at the start
 * through green and amber to red at the far end, so the fill's own end says how far
 * the context has gone.
 */
export const runwayColor = (cell: number, width: number): string => {
  const k = width <= 1 ? 0 : cell / (width - 1)
  const span = RUNWAY_STOPS.length - 1
  const seg = Math.min(span - 1, Math.floor(k * span))
  const t = k * span - seg
  const from = RUNWAY_STOPS[seg] ?? RUNWAY_STOPS[0]
  const to = RUNWAY_STOPS[seg + 1] ?? RUNWAY_STOPS[0]
  const mix = (i: number) =>
    Math.round(parseInt(from.slice(i, i + 2), 16) + (parseInt(to.slice(i, i + 2), 16) - parseInt(from.slice(i, i + 2), 16)) * t)
      .toString(16)
      .padStart(2, '0')
  return `#${mix(1)}${mix(3)}${mix(5)}`
}
