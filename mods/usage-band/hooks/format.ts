import type { DayStart, FiveSample, Ledger, Live } from '../types'

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

/** The one colour the band keeps while quiet: the model's, from the Claude Code theme. */
export const FIGURE_COLOR = { model: 'claude' } as const

export const usd = (n: number): string => `$${n.toFixed(2)}`

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

/**
 * A limit's pace: the share used over the share of its window gone, in percent. 100 runs
 * out exactly at the reset, above it sooner. Null at the window's very start (nothing gone
 * to divide by) and when the reset time is unknown or past.
 */
export const paceOf = (percentUsed: number, resetsAt: string | null, windowMs: number, now: number): number | null => {
  const gone = evenPace(resetsAt, windowMs, now)
  if (gone === null || gone === 0) return null
  return Math.round((percentUsed / gone) * 100)
}

/** A pace's colour: past 80% warns, past 100% (out before the reset) is red, below that it stays quiet. */
export const paceLevel = (pace: number): Level => (pace > 100 ? 'error' : pace > 80 ? 'warning' : 'success')

// --- the week's day budget ---------------------------------------------------------

const DAY = 24 * HOUR

/** The engine's local date, `2026-10-08`: the day a budget belongs to. */
export const dayOf = (at: number): string => {
  const d = new Date(at)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Where today began for the week: kept through the day, taken again from this reading on
 * a new day, a new week (another reset time), or a fall in use. The first reading of the
 * day stands in for midnight's, which no machine may have seen.
 */
export const nextDayStart = (prev: DayStart | null, used: number, resetsAt: string | null, now: number): DayStart => {
  const day = dayOf(now)
  if (prev !== null && prev.day === day && prev.resetsAt === resetsAt && used >= prev.used) return prev
  return { day, used, resetsAt }
}

/** Days from today to the reset, today and the reset's own day each counted whole. */
export const daysLeft = (resetsAt: string, now: number): number => {
  const d = new Date(now)
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.max(1, Math.ceil((Date.parse(resetsAt) - midnight) / DAY))
}

/** Today's share of what the week had left when today began, and what today has used of it. */
export type Budget = {
  /** Percent of the week used since today began. */
  today: number
  /** Percent of the week today may use: what was left at its start over the days to the reset. */
  budget: number
  /** Tomorrow's share of what is left now; null on the reset's own day. */
  tomorrow: number | null
  daysLeft: number
  /** Where today's budget runs out on the week's gauge. */
  mark: number
}

/** Null when the reset time is unknown or past. */
export const weekBudget = (start: DayStart, used: number, resetsAt: string | null, now: number): Budget | null => {
  if (resetsAt === null || !(Date.parse(resetsAt) > now)) return null
  const days = daysLeft(resetsAt, now)
  const budget = (100 - start.used) / days
  return {
    today: used - start.used,
    budget,
    tomorrow: days > 1 ? (100 - used) / (days - 1) : null,
    daysLeft: days,
    mark: Math.min(100, start.used + budget),
  }
}

/** Today against its budget: past 80% of it warns, past it is red. */
export const budgetLevel = (today: number, budget: number): Level =>
  today > budget ? 'error' : today > budget * 0.8 ? 'warning' : 'success'

/**
 * The week's head: `today 9% of 16%`, then once past it what tomorrow is left with; once a
 * day's share is under 1%, what is left over how many days; nothing once the week is spent.
 */
export const weekHead = (b: Budget, used: number): { text: string; level: Level | null }[] => {
  if (used >= 100) return []
  if (b.budget < 1) return [{ text: `${Math.round(100 - used)}% left for ${b.daysLeft}d`, level: 'warning' }]
  const head: { text: string; level: Level | null }[] = [
    { text: `today ${Math.round(b.today)}% of ${Math.round(b.budget)}%`, level: budgetLevel(b.today, b.budget) },
  ]
  if (b.today > b.budget && b.tomorrow !== null) head.push({ text: `tomorrow ${Math.round(b.tomorrow)}%`, level: null })
  return head
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

