import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { BRANCH_MAX, cells, fit, gitdirOf, headOf, locationOf, parentOf } from '../hooks/where'

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
  ` ${path} ` + (branch === undefined ? '' : `  ${branch} `) + tail + 'BELOW'

// A drawn tree's text, its string children joined in order.
const flat = (node: unknown): string =>
  typeof node === 'string'
    ? node
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
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', props: {}, children: ['BELOW'] }))
  await $.session.start({ cwd: cwd.now, surface: 'terminal', isInteractive: true })
  await clock.settle()
  return clock
}

const band = ($: Engine, props = {}) => $.ui.mount({ plugin: 'path-band', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, ...props } })
const toolCall = ($: Engine) => $.tool.call({ tool: 'Bash', command: 'git switch dev' })

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
})

describe('path-band', () => {
  test('draws the working location and its branch above the bands beneath', async ($, on) => {
    repo(on)
    await start($, on, { now: '/w/skills/mods' })
    const text = flat(await (await band($)).drawn())
    expect(text).toBe(line('skills/mods', 'main'))
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
    await clock.advance(30_000)
    expect(flat(await ui.drawn())).toBe(line('skills', 'other'))
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
    // Measured: inside the hook of the call that ran `cd`, the session's directory is still the old one.
    await toolCall($)
    cwd.now = '/w/skills/mods'
    expect(flat(await ui.drawn())).toBe(line('skills', 'main'))
    await clock.advance(1_000)
    expect(flat(await ui.drawn())).toBe(line('skills/mods', 'main'))
  })

  test('a survey takes the line away and leaves the bands beneath', async ($, on) => {
    repo(on)
    await start($, on, { now: '/w/skills' })
    expect(flat(await (await band($, { hasSurvey: true })).drawn())).toBe('BELOW')
  })
})
