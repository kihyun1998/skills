import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Chip, Head } from '../types'
import { fit, gitdirOf, headOf, locationOf, parentOf, sepOf } from './where'

const where = atom({ plugin: 'path-band', key: 'where' } as const, null)
/** thegraph-panel's run as its chip draws (ADR-0099); undefined while that mod is absent. */
const panelChip = { plugin: 'thegraph-panel', key: 'chip' } as const

/** Blank cells at the line's left and right, as usage-band keeps, so the bands share their edges. */
const LEFT = 2
const RIGHT = 1
/** A checkout made outside the session (another terminal) shows within this. */
const TICK_MS = 30_000
/** Inside the hook of the call that ran a `cd`, the session's directory still reads the old one; it is read again this much later. */
const SETTLE_MS = 1_000

// The folder the line was last worked out for, and the working tree found above it.
let dirSeen: string | null = null
let top: string | null = null
let headPath: string | null = null
// HEAD's modification time when last read, so an unchanged HEAD is not read again.
let headSeen = -1
let head: Head | null = null
let home: string | null | undefined

// A chip as thegraph-panel writes it; anything else (an older shape, no run) draws none.
const chipOf = (value: unknown): Chip | null =>
  value !== null &&
  typeof value === 'object' &&
  'head' in value &&
  typeof value.head === 'string' &&
  'conductor' in value &&
  'children' in value &&
  Array.isArray(value.children)
    ? (value as Chip)
    : null

// thegraph-panel's ui.press hook takes each press on the run's buttons, so their own closure has nothing to do.
const pressedByPanel = () => undefined

const statOf = ($: EngineInterface, path: string) => $.fs.stat(path).catch(() => null)

// The working tree holding `dir`: the nearest folder above it with a `.git`, a folder in a
// repository's own tree, a file naming the gitdir in a worktree.
const findTop = async ($: EngineInterface, dir: string): Promise<{ top: string; gitdir: string } | null> => {
  for (let d: string | null = dir; d !== null; d = parentOf(d as string)) {
    const dotGit = `${d.replace(/[\\/]+$/, '')}${sepOf(d)}.git`
    const st = await statOf($, dotGit)
    if (st === null) continue
    if (st.kind === 'dir') return { top: d, gitdir: dotGit }
    const text = await $.fs.read(dotGit).catch(() => '')
    const gitdir = gitdirOf(text, d)
    return gitdir === null ? null : { top: d, gitdir }
  }
  return null
}

// Works the line out again when the folder or HEAD has changed since it was last drawn.
const check = async ($: EngineInterface) => {
  // The session's directory follows a shell `cd`, /cd and worktree moves; its root does not
  // follow a shell `cd`, and CwdChanged does not fire for one (ADR-0081).
  const dir = await $.session.cwd()
  if (home === undefined) home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? null
  if (dir !== dirSeen) {
    dirSeen = dir
    const found = await findTop($, dir)
    top = found?.top ?? null
    headPath = found === null ? null : `${found.gitdir}${sepOf(found.gitdir)}HEAD`
    headSeen = -1
    head = null
  }
  if (headPath !== null) {
    const st = await statOf($, headPath)
    const mtime = st?.mtimeMs ?? -1
    if (mtime !== headSeen) {
      headSeen = mtime
      head = st === null ? null : headOf(await $.fs.read(headPath).catch(() => ''))
    }
  }
  const next = { path: locationOf(dir, top, home), head }
  await update($, where, w => (w !== null && w.path === next.path && w.head?.branch === head?.branch && w.head?.sha === head?.sha ? w : next))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await check($)
    $.clock.every(TICK_MS, () => void check($).catch(() => undefined))
    return result
  })

  // /clear, /resume and /branch start $.state over without a session.start.
  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    const result = await next(e)
    dirSeen = null
    await check($)
    return result
  }).catch(($, e, next) => next(e))

  // A checkout, a worktree entered, a `cd`: each happens under a tool call.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      await check($)
      $.clock.after(SETTLE_MS, () => void check($).catch(() => undefined))
    }
    return result
  }).catch(($, e, next) => next(e))

  // One line over whatever the other bands draw: the working location and its branch, two chips,
  // and while a thegraph run is open its chip, a conductor's children and a worker's way back.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const w = await read($, where)
    if (w === null || e.props.hasSurvey) return below

    const { Box, Button, Text } = $.ui.resolve(e)
    // The main screen reports no clicks: each button's hotkey is drawn after it (ctrl+x tab focuses the band).
    const isMain = e.viewport?.isFullscreen === false
    const shown = fit(w, e.props.bodyColumns - LEFT - RIGHT, chipOf(await read($, panelChip)), isMain)
    const isDetached = w.head !== null && w.head.branch === null
    const hint = (key: string | null) => (isMain && key !== null ? <Text dimColor>{key}</Text> : null)
    const line = (
      <Box flexDirection="row" paddingLeft={LEFT} paddingRight={RIGHT}>
        <Text wrap="truncate-end">
          <Text backgroundColor="suggestion" color="inverseText">{` ${shown.path} `}</Text>
          {shown.branch !== null && <Text> </Text>}
          {shown.branch !== null && (
            <Text backgroundColor={isDetached ? 'warning' : 'success'} color="inverseText">{` ${shown.branch} `}</Text>
          )}
          {isDetached && <Text dimColor> detached</Text>}
        </Text>
        {shown.chip !== null && <Text> </Text>}
        {shown.chip !== null && (
          <Button key="thegraph" variant="primary" hotkey="g" onPress={pressedByPanel}>
            {shown.chip}
          </Button>
        )}
        {shown.chip !== null && hint('g')}
        {shown.children.map(c => (
          <Box flexDirection="row">
            <Text> </Text>
            {c.address === null ? (
              <Text color={c.state === 'done' ? 'success' : c.state === 'blocked' ? 'warning' : undefined} dimColor={c.state === 'waiting'}>
                {c.text}
              </Text>
            ) : (
              <Button key={`thegraph-worker-${c.address}`} variant="primary" hotkey={c.hotkey ?? undefined} onPress={pressedByPanel}>
                {c.text}
              </Button>
            )}
            {c.address !== null && hint(c.hotkey)}
          </Box>
        ))}
        {shown.back !== null && <Text> </Text>}
        {shown.back !== null && (
          <Button key="thegraph-conductor" hotkey="c" dimColor onPress={pressedByPanel}>
            {shown.back}
          </Button>
        )}
        {shown.back !== null && hint('c')}
      </Box>
    )
    return (
      <Box flexDirection="column">
        {line}
        {below}
      </Box>
    )
  })
}
