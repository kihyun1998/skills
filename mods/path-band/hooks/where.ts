import type { Chip, Head, Where } from '../types'

/** The longest a branch chip's name runs before it is cut. */
export const BRANCH_MAX = 40

// Hangul, CJK and full-width forms take two cells in a terminal.
const isWide = (c: string) => /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(c)

export const cells = (s: string) => [...s].reduce((n, c) => n + (isWide(c) ? 2 : 1), 0)

/** `s` cut at its end to `w` cells, the last of them `…`. */
export const cutEnd = (s: string, w: number): string => {
  if (cells(s) <= w) return s
  if (w <= 0) return ''
  let out = ''
  let n = 0
  for (const c of s) {
    const k = isWide(c) ? 2 : 1
    if (n + k > w - 1) break
    out += c
    n += k
  }
  return `${out}…`
}

/** `s` cut at its start to `w` cells, the first of them `…`: a path keeps the folder it ends in. */
export const cutStart = (s: string, w: number): string => {
  if (cells(s) <= w) return s
  if (w <= 0) return ''
  const cs = [...s]
  let out = ''
  let n = 0
  for (let i = cs.length - 1; i >= 0; i--) {
    const c = cs[i] ?? ''
    const k = isWide(c) ? 2 : 1
    if (n + k > w - 1) break
    out = c + out
    n += k
  }
  return `…${out}`
}

export const sepOf = (path: string) => (path.includes('\\') ? '\\' : '/')

const trimSep = (path: string) => (/^([A-Za-z]:)?[\\/]$/.test(path) ? path : path.replace(/[\\/]+$/, ''))

/** The folder holding `path`, or null at a root. */
export const parentOf = (path: string): string | null => {
  const p = trimSep(path)
  const cut = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  if (cut < 0) return null
  const parent = p.slice(0, cut) || p.slice(0, 1)
  const root = /^[A-Za-z]:$/.test(parent) ? `${parent}${sepOf(p)}` : parent
  return root === p ? null : root
}

export const baseName = (path: string) => trimSep(path).split(/[\\/]/).at(-1) ?? path

const isAbsolute = (path: string) => /^([A-Za-z]:)?[\\/]/.test(path)

// Windows paths compare without regard to case.
const sameStart = (path: string, top: string) => {
  const fold = (s: string) => (sepOf(s) === '\\' ? s.toLowerCase() : s)
  const p = fold(trimSep(path))
  const t = fold(trimSep(top))
  return p === t || p.startsWith(t + sepOf(top)) || p.startsWith(`${t}/`)
}

/** Where a `.git` file's `gitdir:` line points, resolved against the folder holding it; null if it has none. */
export const gitdirOf = (text: string, dir: string): string | null => {
  const m = /^gitdir:\s*(.+?)\s*$/m.exec(text)
  const target = m?.[1]
  if (target === undefined) return null
  return isAbsolute(target) ? target : `${trimSep(dir)}${sepOf(dir)}${target}`
}

/** What `HEAD` names: a branch, or a commit when detached; null when it is neither. */
export const headOf = (text: string): Head | null => {
  const t = text.trim()
  const ref = /^ref:\s*refs\/heads\/(.+)$/.exec(t)
  if (ref?.[1] !== undefined) return { branch: ref[1], sha: null }
  if (/^[0-9a-f]{40,64}$/.test(t)) return { branch: null, sha: t.slice(0, 7) }
  return null
}

/**
 * The working location (GLOSSARY): the working tree's folder name and the path
 * beneath it; outside any working tree, the path with `home` shortened to `~`.
 */
export const locationOf = (dir: string, top: string | null, home: string | null): string => {
  const slash = (s: string) => s.replace(/\\/g, '/')
  if (top !== null && sameStart(dir, top)) {
    const rel = slash(trimSep(dir).slice(trimSep(top).length)).replace(/^\/+/, '')
    return rel === '' ? baseName(top) : `${baseName(top)}/${rel}`
  }
  if (home !== null && sameStart(dir, home)) {
    const rel = slash(trimSep(dir).slice(trimSep(home).length)).replace(/^\/+/, '')
    return rel === '' ? '~' : `~/${rel}`
  }
  return slash(dir)
}

/** The longest the chip's issue runs before it is cut: a number always fits, a long issue file name does not. */
export const ISSUE_MAX = 24

/** The path keeps this many cells before the run's chip gives up any of its own; under it, the path is cut further. */
export const PATH_MIN = 12

/** The hotkeys of the children's buttons, in list order (`g` is the chip's, `c` the way back's). */
export const CHILD_KEYS = 'asdfhjkl'

const CHILD_MARK: Record<Chip['children'][number]['state'], string> = { done: '✓', working: '◐', waiting: '·', blocked: '⚠' }

/** One child as the line draws it: its label and mark, its worker's terminal when it is a button, and that button's hotkey. */
export type ShownChild = { text: string; state: Chip['children'][number]['state']; address: string | null; hotkey: string | null }

/** The text of everything on the line at its width. */
export type Shown = { path: string; branch: string | null; chip: string | null; children: ShownChild[]; back: string | null }

/**
 * The text of everything on the line at `width` cells: the branch whole up to BRANCH_MAX,
 * the path cut at its start. A run's chip and its children take what the path can spare
 * down to PATH_MIN: the chip drops its time, its step and its head in turn, then the
 * children that are no button go, then the rest, and the way back shortens to `↩`.
 * `hints` counts the cell each button's hotkey takes after it on the main screen.
 */
export const fit = (where: Where, width: number, chip: Chip | null = null, hints = false): Shown => {
  const head = where.head
  const name = head === null ? null : cutEnd(head.branch ?? head.sha ?? '', BRANCH_MAX)
  // A chip is its text with a space either side, one space before it; a detached head adds ` detached` after its chip.
  const branchCells = name === null ? 0 : 1 + cells(name) + 2 + (head?.branch === null ? cells(' detached') : 0)
  const pathOf = (rest: number) => cutStart(where.path, Math.max(1, rest - 2))
  if (chip === null) return { path: pathOf(width - branchCells), branch: name, chip: null, children: [], back: null }

  const issue = chip.issue === null ? null : cutEnd(chip.issue, ISSUE_MAX)
  const words = (...ws: (string | null)[]) => ws.filter(w => w !== null && w !== '').join(' ')
  const mains = [
    words(chip.head, issue, chip.step, chip.time),
    words(chip.head, issue, chip.step),
    words(chip.head, issue),
    issue ?? chip.head,
  ]
  let n = 0
  const all: ShownChild[] = chip.children.map(c => ({
    text: `${c.label} ${CHILD_MARK[c.state]}`,
    state: c.state,
    address: c.address,
    hotkey: c.address === null ? null : (CHILD_KEYS[n++] ?? null),
  }))
  const live = all.filter(c => c.address !== null)
  const backs = chip.conductor === null ? [null, null] : ['↩ conductor', '↩']
  // A button is `[ text ]` with a space before it, and its hotkey after it where hints are drawn.
  const button = (text: string, hotkey: boolean) => 1 + cells(text) + 4 + (hints && hotkey ? 1 : 0)
  const levels = [
    ...mains.map(main => ({ main, children: all, back: backs[0] ?? null })),
    { main: mains[3] ?? '', children: live, back: backs[0] ?? null },
    { main: mains[3] ?? '', children: [], back: backs[1] ?? null },
  ]
  const restOf = (l: (typeof levels)[number]) =>
    width -
    branchCells -
    button(l.main, true) -
    l.children.reduce((sum, c) => sum + (c.address === null ? 1 + cells(c.text) : button(c.text, c.hotkey !== null)), 0) -
    (l.back === null ? 0 : button(l.back, true))
  const floor = Math.min(cells(where.path), PATH_MIN) + 2
  const level = levels.find(l => restOf(l) >= floor) ?? levels[levels.length - 1]!
  return { path: pathOf(restOf(level)), branch: name, chip: level.main, children: level.children, back: level.back }
}
