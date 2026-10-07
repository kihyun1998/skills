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

/** One step line of a run sheet: `- [~] make-it`, and the note under it for the next step. */
export type SheetStep = { key: string; mark: 'todo' | 'doing' | 'done'; note: string | null }

/** The run sheet thegraph keeps in the OS temp folder (ADR-0080), as last written. */
export type Sheet = {
  path: string
  /** The issue as read-it resolved it, and its title. */
  issue: string | null
  /** read-it's route label, verbatim: trivial, open decision, prose, code. */
  route: string | null
  steps: SheetStep[]
  carried: string[]
}

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
  /** Where this run's sheet lives: the path this plugin named when thegraph expanded, or one the run wrote itself. */
  sheetPath: string | null
  /** The run's own account, once it has written a run sheet; it outranks what the events suggest. */
  sheet: Sheet | null
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
