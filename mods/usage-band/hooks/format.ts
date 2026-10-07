import type { Ledger, Live } from '../types'

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

const PIE = ['○', '◔', '◑', '◕', '●'] as const

/** A quarter-step pie for a percentage, then the number: `◕ 68%`. */
export const pieFigure = (used: number): string =>
  `${PIE[Math.max(0, Math.min(4, Math.round(used / 25)))]} ${used}%`

export const usd = (n: number): string => `$${n.toFixed(2)}`

/** `2h13m` until `resetsAt`, or null when it is unknown or past. */
export const resetIn = (resetsAt: string | null, now: number): string | null => {
  if (resetsAt === null) return null
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at) || at <= now) return null
  const mins = Math.ceil((at - now) / 60_000)
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}m`
}

/** A burn rate is loud once it runs past 1.5x the average of the readings so far. */
export const isBurnHot = (burn: number, readings: readonly number[]): boolean => {
  if (readings.length < 3) return false
  const avg = readings.reduce((a, b) => a + b, 0) / readings.length
  return avg > 0 && burn > avg * 1.5
}

/** The dial's four frames, a quarter turn each: open arcs, so no frame reads as one of the pies. */
export const DIAL = ['◜', '◝', '◞', '◟'] as const

/**
 * How long the dial waits between quarter turns: one turn a second at $80/h,
 * as fast as the money goes, held between 8 frames a second and one every 2 s.
 */
export const dialDelayMs = (burnPerHour: number): number =>
  Math.max(125, Math.min(2000, 20_000 / burnPerHour))

export type Trend = { arrow: string; tone: 'up' | 'down' | 'flat'; change: number }

/** The last burn reading against the one before it: ↑ past +15%, ↗ past +3%, mirrored down. */
export const trendOf = (readings: readonly number[]): Trend | null => {
  const last = readings.at(-1)
  const prev = readings.at(-2)
  if (last === undefined || prev === undefined || prev <= 0) return null
  const change = (last - prev) / prev
  if (change > 0.15) return { arrow: '↑', tone: 'up', change }
  if (change > 0.03) return { arrow: '↗', tone: 'up', change }
  if (change < -0.15) return { arrow: '↓', tone: 'down', change }
  if (change < -0.03) return { arrow: '↘', tone: 'down', change }
  return { arrow: '→', tone: 'flat', change }
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
