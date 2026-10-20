import type { Head, Where } from '../types'

/** The longest a branch chip's name runs before it is cut (thegraph-panel's run-name limit). */
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

/** The text in each chip at `width` cells: the branch whole up to BRANCH_MAX, the path cut at its start. */
export const fit = (where: Where, width: number): { path: string; branch: string | null } => {
  const head = where.head
  const name = head === null ? null : cutEnd(head.branch ?? head.sha ?? '', BRANCH_MAX)
  // A chip is its text with a space either side; a detached head adds ` detached` after its chip.
  const branchCells = name === null ? 0 : 1 + cells(name) + 2 + (head?.branch === null ? cells(' detached') : 0)
  const path = cutStart(where.path, Math.max(1, width - branchCells - 2))
  return { path, branch: name }
}
