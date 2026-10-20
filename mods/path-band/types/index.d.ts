/** What `HEAD` names: a branch, or the short SHA of a detached commit. */
export type Head = { branch: string; sha: null } | { branch: null; sha: string }

/** What the line draws: the working location, and its head when it is inside a working tree. */
export type Where = { path: string; head: Head | null }

declare module 'claude-code' {
  interface PluginState {
    'path-band': {
      where: Where | null
    }
  }
}
