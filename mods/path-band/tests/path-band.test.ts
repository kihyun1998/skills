import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { BRANCH_MAX, ISSUE_MAX, PATH_MIN, cells, fit, gitdirOf, headOf, locationOf, parentOf } from '../hooks/where'
import type { Chip } from '../types'

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

const SHA = 'b62786b0c1d2e3f405162738495a6b7c8d9e0f12'

// What the line reads as text: each chip its words with a space either side, one space between.
const line = (path: string, branch?: string, tail = '') =>
  ` ${path} ` + (branch === undefined ? '' : `  ${branch} `) + tail

const isButton = (n: unknown): n is { props: { label: string } } =>
  n !== null && typeof n === 'object' && 'type' in n && n.type === 'Button'

// A drawn tree's text, its string children joined in order, a Button as the terminal draws it.
const flat = (node: unknown): string =>
  typeof node === 'string'
    ? node
    : isButton(node)
      ? `[ ${node.props.label} ]`
      : node !== null && typeof node === 'object' && 'children' in node && Array.isArray(node.children)
      ? node.children.map(flat).join('')
      : ''

// The files the hooks stat and read, keyed without a drive or backslashes, since the engine
// resolves a path for its own OS. Each write a newer modification time; reads are counted.
const files = (on: On) => {
  const map = new Map<string, { kind: 'file' | 'dir'; text: string; mtime: number }>()
  let writes = 0
  const reads: string[] = []
  const key = (path: string) => path.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '')
  on('fs.stat', (_$, e) => {
    const f = map.get(key(e.path))
    if (f === undefined) throw new Error(`ENOENT: ${e.path}`)
    return { value: { kind: f.kind, size: f.text.length, mtimeMs: f.mtime, isLink: false } }
  })
  on('fs.read', (_$, e) => {
    reads.push(key(e.path))
    const f = map.get(key(e.path))
    if (f === undefined) throw new Error(`ENOENT: ${e.path}`)
    return { value: f.text }
  })
  return {
    dir: (path: string) => void map.set(key(path), { kind: 'dir', text: '', mtime: ++writes }),
    write: (path: string, text: string) => void map.set(key(path), { kind: 'file', text, mtime: ++writes }),
    reads,
  }
}

// The session's directory, which a shell `cd`, /cd and worktree moves change; HOME as the environment has it.
const start = async ($: Engine, on: On, cwd: { now: string }) => {
  const clock = mock.clock(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: cwd.now }))
  on('env.get', (_$, e) => ({ value: e.name === 'HOME' ? '/home/u' : undefined }))
  await $.session.start({ cwd: cwd.now, surface: 'terminal', isInteractive: true })
  await clock.settle()
  return clock
}

// thegraph-panel's chip as path-band reads it: undefined stands for the panel not installed.
const panelChip = (on: On, value: unknown) => {
  const chip = { value }
  on('state.get', (_$, e, next) =>
    e.plugin === 'thegraph-panel' && e.key === 'chip' ? { value: { value: chip.value as Chip | null, version: chip.value === undefined ? 0 : 1 } } : next(e),
  )
  return chip
}

// A run's chip as thegraph-panel writes it: a plain /thegraph unless told otherwise.
const runChip = (over: Partial<Chip> = {}): Chip => ({
  head: 'thegraph', issue: '#52', step: 'make-it ◐', time: '4m', children: [], conductor: null, ...over,
})

// A conductor at work on its second child of three.
const CONDUCTOR = runChip({
  head: 'herdr',
  issue: '#38',
  step: 'workers ◐',
  time: '12m',
  children: [
    { label: '#37', state: 'done', address: null },
    { label: '#38', state: 'working', address: 't38' },
    { label: '#39', state: 'waiting', address: null },
  ],
})

const band = ($: Engine, props = {}) => $.ui.mount({ plugin: 'path-band', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, ...props } })
// A tool call as the session keeps it: the row its result comes back in, a subagent's with its id.
let rows = 0
const toolCall = ($: Engine, agentId?: string) =>
  $.session.append({
    message: { type: 'user', role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '' }] },
    door: 'tool-result',
    origin: { kind: 'tool', tool: 'Bash' },
    uuid: `row-${++rows}`,
    ...(agentId === undefined ? {} : { agentId }),
  })

// A repository at /w/skills on main, and a worktree of it at /w/wt-path on feat/path-band.
const repo = (on: On) => {
  const fs = files(on)
  fs.dir('/w/skills/.git')
  fs.write('/w/skills/.git/HEAD', 'ref: refs/heads/main\n')
  fs.write('/w/wt-path/.git', 'gitdir: /w/skills/.git/worktrees/wt-path\n')
  fs.write('/w/skills/.git/worktrees/wt-path/HEAD', 'ref: refs/heads/feat/path-band\n')
  return fs
}

describe('where', () => {
  test('HEAD names a branch, or a detached commit by its short SHA', () => {
    expect(headOf('ref: refs/heads/feat/x\n')).toEqual({ branch: 'feat/x', sha: null })
    expect(headOf(`${SHA}\n`)).toEqual({ branch: null, sha: 'b62786b' })
    expect(headOf('garbage')).toBe(null)
  })

  test("a worktree's .git file points at its gitdir, a relative one from the folder holding it", () => {
    expect(gitdirOf('gitdir: D:/w/skills/.git/worktrees/a\n', 'D:\\w\\a')).toBe('D:/w/skills/.git/worktrees/a')
    expect(gitdirOf('gitdir: ../.git/modules/sub', '/w/r/sub')).toBe('/w/r/sub/../.git/modules/sub')
    expect(gitdirOf('nothing here', '/w')).toBe(null)
  })

  test('the parent of a folder, up to the root, on both kinds of path', () => {
    expect(parentOf('D:\\github\\skills')).toBe('D:\\github')
    expect(parentOf('D:\\github')).toBe('D:\\')
    expect(parentOf('D:\\')).toBe(null)
    expect(parentOf('/w/skills')).toBe('/w')
    expect(parentOf('/w')).toBe('/')
    expect(parentOf('/')).toBe(null)
  })

  test("the working location: the tree's folder and the path beneath it, or ~ outside every tree", () => {
    expect(locationOf('D:\\github\\skills\\mods\\usage-band', 'D:\\github\\skills', null)).toBe('skills/mods/usage-band')
    expect(locationOf('d:\\github\\skills', 'D:\\github\\skills', null)).toBe('skills')
    expect(locationOf('C:\\Users\\u\\Downloads\\logos', null, 'C:\\Users\\u')).toBe('~/Downloads/logos')
    expect(locationOf('/w/skillsets', '/w/skills', null)).toBe('/w/skillsets')
    expect(locationOf('/tmp/x', null, '/home/u')).toBe('/tmp/x')
  })

  test('too wide, the path gives way at its start and the branch stays whole up to its limit', () => {
    const where = { path: 'skills-thegraph-panel/mods/thegraph-panel/hooks/tests', head: { branch: 'main', sha: null } as const }
    const shown = fit(where, 30)
    expect(shown.branch).toBe('main')
    expect(shown.path.startsWith('…')).toBe(true)
    expect(shown.path.endsWith('hooks/tests')).toBe(true)
    // [ path ] [ main ]: both chips and the space between fill the width exactly.
    expect(cells(shown.path) + 2 + 1 + cells('main') + 2).toBe(30)

    const long = fit({ path: 'skills', head: { branch: 'x'.repeat(60), sha: null } }, 200)
    expect(cells(long.branch ?? '')).toBe(BRANCH_MAX)
  })

  test("a run's chip takes its cells from the path, and a long issue file name is cut at its end", () => {
    const where = { path: 'skills-thegraph-panel/mods/thegraph-panel/hooks/tests', head: { branch: 'main', sha: null } as const }
    const shown = fit(where, 60, runChip())
    expect(shown.chip).toBe('thegraph #52 make-it ◐ 4m')
    // [ path ] [ main ] [ chip ]: the chip a button, `[ text ]`, and the spaces between fill the width exactly.
    expect(cells(shown.path) + 2 + 1 + cells('main') + 2 + 1 + cells('thegraph #52 make-it ◐ 4m') + 4).toBe(60)
    expect(fit(where, 60).chip).toBe(null)
    const named = fit({ path: 'skills', head: null }, 200, runChip({ issue: `0${'x'.repeat(40)}` }))
    expect(named.chip).toContain(`0${'x'.repeat(ISSUE_MAX - 2)}… `)
  })

  test('narrowing, the chip drops its time, step and head, then the plain children, then the rest; path and branch stay', () => {
    const where = { path: 'skills/mods/path-band', head: { branch: 'main', sha: null } as const }
    // Path whole (21 cells, over PATH_MIN) at the widest; each step down gives up the next piece.
    const at = (w: number) => fit(where, w, CONDUCTOR, true)
    const wide = at(120)
    expect(wide.path).toBe('skills/mods/path-band')
    expect(wide.chip).toBe('herdr #38 workers ◐ 12m')
    expect(wide.children.map(c => c.text)).toEqual(['#37 ✓', '#38 ◐', '#39 ·'])
    const seen: string[] = []
    let last = wide
    for (let w = 120; w >= 20; w--) {
      const s = at(w)
      const key = `${s.chip}|${s.children.map(c => c.text).join(',')}`
      if (seen.at(-1) !== key) seen.push(key)
      // The branch never gives way, and the path keeps PATH_MIN cells while the run's pieces can give any.
      expect(s.branch).toBe('main')
      if (s.children.length > 0 || s.chip !== '#38') expect(cells(s.path)).toBeGreaterThanOrEqual(PATH_MIN)
      last = s
    }
    expect(seen).toEqual([
      'herdr #38 workers ◐ 12m|#37 ✓,#38 ◐,#39 ·',
      'herdr #38 workers ◐|#37 ✓,#38 ◐,#39 ·',
      'herdr #38|#37 ✓,#38 ◐,#39 ·',
      '#38|#37 ✓,#38 ◐,#39 ·',
      '#38|#38 ◐',
      '#38|',
    ])
    // Narrower still, only the path is cut further.
    expect(last.chip).toBe('#38')
    expect(cells(last.path)).toBeLessThan(PATH_MIN)
  })

  test("a worker's way back shortens to ↩ last; the children's hotkeys are a, s, d in list order of the buttons", () => {
    const where = { path: 'skills', head: { branch: 'main', sha: null } as const }
    const worker = runChip({ head: 'worker', issue: '#38', step: 'check-it ◐', time: '2m', conductor: 't2x' })
    expect(fit(where, 120, worker).back).toBe('↩ conductor')
    expect(fit(where, 30, worker).back).toBe('↩')
    const two = runChip({
      head: 'herdr',
      children: [
        { label: '#1', state: 'done', address: null },
        { label: '#2', state: 'working', address: 't2' },
        { label: '#3', state: 'blocked', address: 't3' },
      ],
    })
    expect(fit(where, 120, two).children.map(c => c.hotkey)).toEqual([null, 'a', 's'])
  })
})

describe('path-band', () => {
  test('draws the working location and its branch', async ($, on) => {
    repo(on)
    await start($, on, { now: '/w/skills/mods' })
    const ui = await band($)
    expect(flat(await ui.drawn())).toBe(line('skills/mods', 'main'))
    // Each plugin's row is asked of it alone, so the line holds nothing drawn beneath it.
    expect(await ui.keepsBeneath()).toBe(false)
  })

  test('in a worktree it names the worktree and reads the branch from its own gitdir', async ($, on) => {
    repo(on)
    await start($, on, { now: '/w/wt-path' })
    expect(flat(await (await band($)).drawn())).toBe(line('wt-path', 'feat/path-band'))
  })

  test('outside every working tree the path is shortened with ~ and there is no branch chip', async ($, on) => {
    files(on)
    await start($, on, { now: '/home/u/Downloads' })
    expect(flat(await (await band($)).drawn())).toBe(line('~/Downloads'))
  })

  test('a detached HEAD shows its short SHA and says detached', async ($, on) => {
    const fs = repo(on)
    fs.write('/w/skills/.git/HEAD', `${SHA}\n`)
    await start($, on, { now: '/w/skills' })
    expect(flat(await (await band($)).drawn())).toBe(line('skills', 'b62786b', ' detached'))
  })

  test('a checkout under a tool call redraws the branch; an unchanged HEAD is not read again', async ($, on) => {
    const fs = repo(on)
    await start($, on, { now: '/w/skills' })
    const ui = await band($)
    const readsBefore = fs.reads.filter(p => p.endsWith('HEAD')).length
    await toolCall($)
    expect(fs.reads.filter(p => p.endsWith('HEAD')).length).toBe(readsBefore)

    fs.write('/w/skills/.git/HEAD', 'ref: refs/heads/dev\n')
    await toolCall($)
    expect(flat(await ui.drawn())).toBe(line('skills', 'dev'))
  })

  test('a checkout from another terminal shows within a tick', async ($, on) => {
    const fs = repo(on)
    const clock = await start($, on, { now: '/w/skills' })
    const ui = await band($)
    fs.write('/w/skills/.git/HEAD', 'ref: refs/heads/other\n')
    await clock.advance(4_000)
    expect(flat(await ui.drawn())).toBe(line('skills', 'main'))
    await clock.advance(1_000)
    expect(flat(await ui.drawn())).toBe(line('skills', 'other'))
  })

  test("a subagent's call is not this session's move: the line waits for the tick", async ($, on) => {
    const fs = repo(on)
    const clock = await start($, on, { now: '/w/skills' })
    const ui = await band($)
    fs.write('/w/skills/.git/HEAD', 'ref: refs/heads/dev\n')
    await toolCall($, 'agent-1')
    await clock.advance(1_000)
    expect(flat(await ui.drawn())).toBe(line('skills', 'main'))
  })

  test('a move under a tool call shows at once when the directory has moved by the hook', async ($, on) => {
    repo(on)
    const cwd = { now: '/w/skills' }
    await start($, on, cwd)
    const ui = await band($)
    cwd.now = '/w/wt-path'
    await toolCall($)
    expect(flat(await ui.drawn())).toBe(line('wt-path', 'feat/path-band'))
  })

  test("a shell cd the call's own hook does not see yet shows once the call settles", async ($, on) => {
    repo(on)
    const cwd = { now: '/w/skills' }
    const clock = await start($, on, cwd)
    const ui = await band($)
    // Measured for a tool.call hook, and kept for this one: in the hook of the call that ran `cd`, the session's directory is still the old one.
    await toolCall($)
    cwd.now = '/w/skills/mods'
    expect(flat(await ui.drawn())).toBe(line('skills', 'main'))
    await clock.advance(1_000)
    expect(flat(await ui.drawn())).toBe(line('skills/mods', 'main'))
  })

  test("a run's chip after the branch while thegraph-panel has one, following it as it changes", async ($, on) => {
    repo(on)
    const chip = panelChip(on, runChip())
    await start($, on, { now: '/w/skills' })
    // A fake answer does not redraw a mounted band as the owner's write does: each value is mounted afresh.
    const drawn = async () => flat(await (await band($)).drawn())
    expect(await drawn()).toBe(line('skills', 'main', ' [ thegraph #52 make-it ◐ 4m ]'))
    chip.value = runChip({ issue: '03-row-height', step: 'done', time: null })
    expect(await drawn()).toBe(line('skills', 'main', ' [ thegraph 03-row-height done ]'))
  })

  test("a conductor's children follow its chip, a live worker's a button; a worker's way back is one", async ($, on) => {
    repo(on)
    const chip = panelChip(on, CONDUCTOR)
    await start($, on, { now: '/w/skills' })
    const ui = await band($)
    expect(flat(await ui.drawn())).toBe(line('skills', 'main', ' [ herdr #38 workers ◐ 12m ] #37 ✓ [ #38 ◐ ] #39 ·'))
    const keys = (await ui.findAll({ type: 'Button' })).map(b => [b.props.key, b.props.hotkey])
    expect(keys).toEqual([['thegraph', 'g'], ['thegraph-worker-t38', 'a']])
    chip.value = runChip({ head: 'worker', issue: '#38', step: 'check-it ◐', time: '2m', conductor: 't2x' })
    const worker = await band($)
    expect(flat(await worker.drawn())).toBe(line('skills', 'main', ' [ worker #38 check-it ◐ 2m ] [ ↩ conductor ]'))
    expect((await worker.findAll({ type: 'Button' })).map(b => [b.props.key, b.props.hotkey])).toEqual([['thegraph', 'g'], ['thegraph-conductor', 'c']])
  })

  test('on the main screen, which reports no clicks, each button is followed by its hotkey', async ($, on) => {
    repo(on)
    panelChip(on, CONDUCTOR)
    await start($, on, { now: '/w/skills' })
    const at = async (isFullscreen: boolean) =>
      flat(await (await $.ui.mount({ plugin: 'path-band', surface: 'terminal', component: 'AbovePrompt', props: BAND, viewport: { columns: 125, rows: 40, isFullscreen } })).drawn())
    expect(await at(false)).toBe(line('skills', 'main', ' [ herdr #38 workers ◐ 12m ]g #37 ✓ [ #38 ◐ ]a #39 ·'))
    expect(await at(true)).toBe(line('skills', 'main', ' [ herdr #38 workers ◐ 12m ] #37 ✓ [ #38 ◐ ] #39 ·'))
  })

  test('no chip while no run is open, nor without thegraph-panel, nor from a value of another shape', async ($, on) => {
    repo(on)
    const chip = panelChip(on, null)
    await start($, on, { now: '/w/skills' })
    expect(flat(await (await band($)).drawn())).toBe(line('skills', 'main'))
    // Not installed or not enabled: the value was never written.
    chip.value = undefined
    expect(flat(await (await band($)).drawn())).toBe(line('skills', 'main'))
    // An older thegraph-panel's label, and a chip missing its head.
    chip.value = '#52'
    expect(flat(await (await band($)).drawn())).toBe(line('skills', 'main'))
    const { head: _head, ...headless } = runChip()
    chip.value = headless
    expect(flat(await (await band($)).drawn())).toBe(line('skills', 'main'))
  })

  test('outside a working tree the chip follows the path', async ($, on) => {
    files(on)
    panelChip(on, runChip())
    await start($, on, { now: '/home/u/Downloads' })
    expect(flat(await (await band($)).drawn())).toBe(line('~/Downloads', undefined, ' [ thegraph #52 make-it ◐ 4m ]'))
  })

  test('a survey takes the line away, passing to what is beneath', async ($, on) => {
    repo(on)
    await start($, on, { now: '/w/skills' })
    const ui = await band($, { hasSurvey: true })
    expect(await ui.keepsBeneath()).toBe(true)
    expect(flat(await ui.drawn())).toBe('')
  })
})
