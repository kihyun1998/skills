/** What `HEAD` names: a branch, or the short SHA of a detached commit. */
export type Head = { branch: string; sha: null } | { branch: null; sha: string }

/** What the line draws: the working location, and its head when it is inside a working tree. */
export type Where = { path: string; head: Head | null }

/**
 * thegraph-panel's run as its chip is drawn here, declared as that mod declares it: the
 * run's kind, the issue, the step at hand and its time, a conductor's children, a worker's
 * conductor. The Buttons drawn from it are keyed `thegraph`, `thegraph-worker-<address>`
 * and `thegraph-conductor`, and thegraph-panel acts on their presses.
 */
export type Chip = {
  head: 'thegraph' | 'herdr' | 'worker'
  issue: string | null
  step: string | null
  time: string | null
  children: { label: string; state: 'done' | 'working' | 'waiting' | 'blocked'; address: string | null }[]
  conductor: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'path-band': {
      where: Where | null
    }
    /** The one thegraph-panel value this mod reads, as that mod declares it (ADR-0099). */
    'thegraph-panel': {
      chip: Chip | null
    }
  }
}
