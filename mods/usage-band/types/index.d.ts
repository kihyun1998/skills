export type RateWindow = {
  kind: string
  percentUsed: number
  resetsAt: string | null
}

/** What the engine measures for this session. */
export type Live = {
  model: string
  context: { tokens: number | null; window: number; percent: number | null }
  rateLimits: RateWindow[]
  usd: number | null
}

/** What ccusage reads from every transcript on this machine. */
export type Ledger = {
  /** The active 5-hour block's cost per hour; null when no block is active. */
  burnPerHour: number | null
  /** Today's total across all sessions; null when ccusage reported no day. */
  today: number | null
}

/** One main-thread request's prompt, as the API reported it: what the cache served, what it wrote, what neither. */
export type CacheReading = { read: number; written: number; uncached: number }

/**
 * Where today began for the week: the day, the week's use then (estimated from this machine's
 * logs when use went unseen before the day's first reading), the last reading seen since, and
 * the reset it counted to.
 */
export type DayStart = { day: string; used: number; lastUsed: number; resetsAt: string | null; isEstimated?: boolean }

/** One reading of the 5-hour window: when it was taken, and how much was used. */
export type FiveSample = { at: number; percentUsed: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': {
      live: Live | null
      effort: string | null
      ledger: Ledger | null
      /** The current 5-hour window's readings, oldest first: what %/h is measured from. */
      fiveSamples: FiveSample[]
      /** The latest main-thread requests' prompt tokens, oldest first: what the cache hit rate is taken over. */
      cacheReadings: CacheReading[]
      /** Where today began for the week, mirrored in $.store so /clear and a new session keep it. */
      dayStart: DayStart | null
    }
  }
}
