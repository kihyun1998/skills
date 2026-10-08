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

/**
 * One line of the run's log, in the order it happened: a step begun, a question and
 * its answer, a file written, a test run, a signal, a note to the next step, an item
 * carried, the end.
 */
export type LogEntry = {
  at: number
  kind: 'step' | 'ask' | 'edit' | 'test' | 'signal' | 'note' | 'carry' | 'end'
  text: string
  /** The answer to a question, a test's counts; null while a question waits. */
  detail: string | null
  /** A test that passed, a file the write created. */
  isOk?: boolean
}

/** A piece of a line drawn in one colour: a theme key or a colour name, or none for the default. */
export type Seg = { text: string; color: string | null }

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
  /** What happened, oldest first; the pane draws it. */
  log: LogEntry[]
}

declare module 'claude-code' {
  interface PluginState {
    'thegraph-panel': {
      run: Run | null
      isPaneOpen: boolean
      /** The clock as last ticked, so a running step's minutes redraw while idle. */
      now: number
      /**
       * What each turn of the run did, keyed by the turn's duration in milliseconds:
       * the closing line carries no other mark of which turn it closes.
       */
      turnLines: Record<string, Seg[]>
    }
  }
}
