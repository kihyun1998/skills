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
  /** Where the issue lives, for this plugin to read: `owner/repo#42`, `#42`, or the issue file's path. */
  source: string | null
  /** read-it's route label, verbatim: trivial, open decision, prose, code. */
  route: string | null
  steps: SheetStep[]
  carried: string[]
  /** A herdr conductor's `## Children`: each line's issue address, and the prose after ` — `. */
  children: { address: string; text: string }[]
}

/**
 * Which run this is: a plain `/thegraph`, a `/thegraph-herdr` conductor, or one of that
 * conductor's workers, each in its own session (ADR-0098).
 */
export type Kind = 'thegraph' | 'herdr' | 'worker'

/** What a worker session knows of its run, from its own `hc` terminal. */
export type Herd = {
  /** The 8 hex digits that end the conductor's sheet name. */
  runId: string
  /** The issue's slug, as the worker's terminal name carries it. */
  slug: string
  /** The conductor's terminal address, the worker terminal's `parent`; null where hc named none. */
  conductor: string | null
}

/** One live `hc` terminal: its address, its name, and its status (`working`, `idle`, `done`, `blocked`, `error`). */
export type Terminal = { address: string; name: string; status: string | null }

/**
 * One child of a conductor: its label (`#37`), where it stands, and its live worker's
 * terminal, null with none. `working` is any live worker not done, `idle` included.
 */
export type Child = { label: string; state: 'done' | 'working' | 'waiting' | 'blocked'; address: string | null }

/**
 * The run as path-band's chip draws it (ADR-0099). path-band draws its Buttons with the keys
 * `thegraph` (the chip), `thegraph-worker-<address>` (a child) and `thegraph-conductor` (a
 * worker's way back), and this plugin's `ui.press` hook acts on them.
 */
export type Chip = {
  /** `thegraph`, `herdr` (a conductor) or `worker`. */
  head: Kind
  /** The issue the commits are for now: a conductor's child at work, else the sheet's issue, else the prompt's label. */
  issue: string | null
  /** The step at hand with its mark (`make-it ◐`, `confirm ◆`), `done`, or null with none. */
  step: string | null
  /** The time in the step at hand (`4m`); null once done or before it began. */
  time: string | null
  /** A conductor's children, in order. */
  children: Child[]
  /** A worker's conductor terminal, for its way back; null for the other kinds. */
  conductor: string | null
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
  /** A test that passed, a file the write created. Absent on a test whose outcome could not be read. */
  isOk?: boolean
}

/**
 * A main-thread tool call the run follows, kept from its tool_use until its result is
 * applied: a question put to the person, a file edit, or a shell command that runs tests,
 * closes the run's issue or reports to the conductor.
 */
export type Call = (
  | { kind: 'ask'; questions: string[] }
  | { kind: 'edit'; name: string }
  | { kind: 'shell'; runner: string | null; isClose: boolean; report: 'done' | 'stuck' | null }
) & {
  /**
   * The call's result as its row carried it, once that came: the text the model read,
   * whether it was an error, and when. Null while the call runs.
   */
  back: { text: string; isError: boolean; at: number } | null
}

/** A piece of a line drawn in one colour (a theme key or a colour name, or none for the default), bold or dim. */
export type Seg = { text: string; color: string | null; bold?: boolean; dim?: boolean }

/** One /thegraph or /thegraph-herdr run, or a herdr worker's, as its skill calls and the turns between them showed it. */
export type Run = {
  kind: Kind
  /** A worker's run and conductor; null for the other kinds. */
  herd: Herd | null
  /** A worker's `done` or `stuck` sent to its conductor, until a step is taken up again. */
  reported: 'done' | 'stuck' | null
  /** What followed `/thegraph` on the prompt (an issue number), or null. */
  label: string | null
  startedAt: number
  route: Route | null
  steps: StepRec[]
  signals: SignalRec[]
  /** The turn ended while the run was open: the next move is the person's. */
  isWaiting: boolean
  /**
   * A question box was put away (Esc) with nothing answered: what the person types
   * next takes the run up again rather than answering, and so never ends it.
   */
  isDismissed: boolean
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
      /** A herdr conductor's run's live worker terminals, as `hc ls` last answered. */
      workers: Terminal[]
      /** The run as path-band's chip draws it; null with no run. */
      chip: Chip | null
      /** The calls whose results are not applied yet, by tool_use id; one is taken out as its result is applied. */
      calls: Record<string, Call>
    }
  }
}
