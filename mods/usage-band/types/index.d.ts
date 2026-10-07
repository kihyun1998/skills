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
    }
  }
}
