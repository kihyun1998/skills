/**
 * Which way the run went after the reading was confirmed: `build` (prose or code,
 * make-it onwards) or `decision` (lens over the options). A trivial run ends at the
 * confirm stop with no step after it, which no event tells apart from a pause.
 */
export type Route = 'build' | 'decision'

/** One step as it happened: a skill thegraph called, or a stop where a person answers. */
export type StepRec = { key: string; startedAt: number; endedAt: number | null }

/** A skill that interrupts the order (redden, firsthand, boundary), and when. */
export type SignalRec = { skill: string; at: number }

/** One /thegraph run, as its skill calls and the turns between them showed it. */
export type Run = {
  /** What followed `/thegraph` on the prompt (an issue number), or null. */
  label: string | null
  startedAt: number
  route: Route | null
  steps: StepRec[]
  signals: SignalRec[]
  /** The turn ended while the run was open: the next move is the person's. */
  isWaiting: boolean
  doneAt: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'thegraph-panel': {
      run: Run | null
      isPaneOpen: boolean
      /** The clock as last ticked, so a running step's minutes redraw while idle. */
      now: number
    }
  }
}
