export type RateWindow = {
  kind: string
  percentUsed: number
  resetsAt: string | null
  /**
   * The engine no longer reports it because its reset time passed with no response since:
   * the window has started over, at 0%, its next reset unknown until a response says it.
   */
  isReset?: true
}

/** The session's credential, as `$.session.authorize()` names it: a login (`bearer`) has plan limits. */
export type Credential = 'bearer' | 'api-key' | null

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
      /** Which credential the session holds: a login expects the 5-hour and weekly limits, a key neither. */
      credential: Credential
    }
  }
}
