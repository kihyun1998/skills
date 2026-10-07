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

declare module 'claude-code' {
  interface PluginState {
    'usage-band': {
      live: Live | null
      effort: string | null
      ledger: Ledger | null
      /** Burn-rate readings, oldest first, the last 60 kept: what "unusually high" is measured against. */
      burns: number[]
      /** The burn-rate dial's frame, 0 to 3: one quarter turn per tick. */
      spin: number
    }
  }
}
