import type { Child, Chip, Kind,LogEntry, Route, Run, Seg, Sheet, SheetStep, StepRec, Terminal } from '../types'

/** The stops where a person answers: after read-it, and after lens. */
export const CONFIRM = 'confirm'
export const DECIDE = 'decide'

/** Skills that are steps of the order; anything else thegraph calls is ignored. */
const STEP_SKILLS = ['read-it', 'lens', 'make-it', 'check-it', 'ask-it']

/** Skills that interrupt the order whenever their moment comes. */
export const SIGNAL_SKILLS = ['firsthand']

/** The step a /thegraph-herdr conductor takes while its workers make and check. */
export const WORKERS = 'workers'

/**
 * The steps a run walks before its sheet says: an open decision's, a herdr conductor's,
 * a herdr worker's, or the build route's.
 */
export const plan = (kind: Kind, route: Route | null): string[] => {
  if (route === 'decision') return ['read-it', CONFIRM, 'lens', DECIDE]
  if (kind === 'herdr') return ['read-it', CONFIRM, WORKERS, 'ask-it']
  if (kind === 'worker') return ['make-it', 'check-it']
  return ['read-it', CONFIRM, 'make-it', 'check-it', 'ask-it']
}

/** How the pane names a route: read-it says prose or code only in its text, which no event carries. */
export const routeName = (route: Route): string => (route === 'decision' ? 'open decision' : 'prose/code')

/** Which run a prompt starts: `/thegraph` or `/thegraph-herdr`; null for any other, `/thegraph-codex` included. */
export const kindOfPrompt = (text: string): Kind | null => {
  const m = /^\/thegraph(-herdr)?(?![\w-])/.exec(text.trim())
  return m === null ? null : m[1] === undefined ? 'thegraph' : 'herdr'
}

/** `/thegraph #42 band redraw` → `#42 band redraw`; null for a prompt that does not start a run. */
export const labelOf = (text: string): string | null => {
  const kind = kindOfPrompt(text)
  if (kind === null) return null
  const rest = text.trim().slice(kind === 'herdr' ? '/thegraph-herdr'.length : '/thegraph'.length).split('\n')[0]?.trim() ?? ''
  return rest === '' ? '' : [...rest].slice(0, 40).join('')
}

export const startRun = (label: string | null, now: number, kind: Kind = 'thegraph'): Run => ({
  kind,
  herd: null,
  reported: null,
  label: label === '' ? null : label,
  startedAt: now,
  route: null,
  steps: [],
  signals: [],
  isWaiting: false,
  isDismissed: false,
  doneAt: null,
  sheetPath: null,
  sheet: null,
  log: [],
})

/** The log keeps this many lines, the oldest dropped first. */
const LOG_MAX = 300

/** Adds a line to the log; a step already the last one begun is not logged again. */
export const addLog = (run: Run, entry: LogEntry): Run => {
  if (entry.kind === 'step' && run.log.findLast(l => l.kind === 'step')?.text === entry.text) return run
  return { ...run, log: [...run.log, entry].slice(-LOG_MAX) }
}

const logged = (run: Run, at: number, kind: LogEntry['kind'], text: string): Run => addLog(run, { at, kind, text, detail: null })

const openStep = (run: Run): StepRec | undefined => run.steps.find(s => s.endedAt === null)
const closeAll = (steps: StepRec[], now: number) => steps.map(s => (s.endedAt === null ? { ...s, endedAt: now } : s))
const begin = (run: Run, key: string, now: number): StepRec[] => [...closeAll(run.steps, now), { key, startedAt: now, endedAt: null }]

/** Right after the confirm stop, nothing begun since: where thegraph picks its route. */
const isAtRoute = (run: Run) => openStep(run) === undefined && run.steps.at(-1)?.key === CONFIRM

/** A skill was expanded while the run is open. */
export const onSkill = (run: Run, skill: string, now: number): Run => {
  if (run.doneAt !== null) return run
  if (SIGNAL_SKILLS.includes(skill)) return logged({ ...run, signals: [...run.signals, { skill, at: now }] }, now, 'signal', skill)
  if (!STEP_SKILLS.includes(skill)) return run
  if (skill === 'lens') {
    // check-it runs lens on every change: only a lens at the route is the open-decision step.
    if (run.route === 'decision' || (run.route === null && isAtRoute(run))) {
      return logged({ ...run, route: 'decision', isWaiting: false, steps: begin(run, skill, now) }, now, 'step', skill)
    }
    return run
  }
  const route: Route | null = skill === 'read-it' ? run.route : (run.route ?? 'build')
  // A worker that takes up a step after reporting has not finished.
  return logged({ ...run, route, isWaiting: false, reported: null, steps: begin(run, skill, now) }, now, 'step', skill)
}

/**
 * The move passed to the person: a main-thread turn ended, or a question
 * (AskUserQuestion) went up within one. Whatever runs now waits on them.
 */
export const onTurnEnd = (run: Run, now: number): Run => {
  if (run.doneAt !== null) return run
  // A worker's turn that ends on its report, with no step taken up since, is the worker's end.
  if (run.kind === 'worker' && run.reported !== null) {
    return logged({ ...run, isWaiting: false, steps: closeAll(run.steps, now), doneAt: now }, now, 'end', run.reported)
  }
  const open = openStep(run)
  if (open?.key === 'read-it') return logged({ ...run, isWaiting: true, steps: begin(run, CONFIRM, now) }, now, 'step', CONFIRM)
  if (open?.key === 'lens') return logged({ ...run, isWaiting: true, steps: begin(run, DECIDE, now) }, now, 'step', DECIDE)
  // Anything else, a trivial end after the confirm included, is the person's to say: the run waits, and the pane's `clear run ×` ends it.
  return { ...run, isWaiting: true }
}

/**
 * The person answered: a prompt of their own, or a question's reply. Null once a finished
 * run has been moved on from, finished by its events or by its sheet checked off whole.
 */
export const onAnswer = (run: Run, now: number): Run | null => {
  // A worker's session is for its one issue: what reaches it after its report is more of that work.
  if (run.kind === 'worker' && run.doneAt !== null) return { ...run, doneAt: null, reported: null, isWaiting: false, isDismissed: false }
  if (isDone(run)) return null
  // After a question put away, the person's words take the step up again: no stop closes, nothing ends.
  if (run.isDismissed) return { ...run, isWaiting: false, isDismissed: false }
  if (!run.isWaiting) return run
  const open = openStep(run)
  if (open?.key === CONFIRM) return { ...run, isWaiting: false, steps: closeAll(run.steps, now) }
  if (open?.key === DECIDE || open?.key === 'ask-it') {
    return logged({ ...run, isWaiting: false, steps: closeAll(run.steps, now), doneAt: now }, now, 'end', 'done')
  }
  return { ...run, isWaiting: false }
}

/** The run's issue was closed, wherever the run had got to: that is its end. */
export const onIssueClosed = (run: Run, now: number): Run =>
  run.doneAt !== null ? run : logged({ ...run, isWaiting: false, steps: closeAll(run.steps, now), doneAt: now }, now, 'end', 'issue closed')

/** A question box put away with nothing answered: the run still waits on the person, and is not answered. */
export const onDismiss = (run: Run): Run => (run.doneAt !== null ? run : { ...run, isWaiting: true, isDismissed: true })

/**
 * A main-thread file edit. Right after the confirm, with nothing begun, it is
 * make-it's work started without its skill being expanded: an inference, so it
 * only ever opens make-it there, and never on the decision route.
 */
export const onEdit = (run: Run, now: number): Run =>
  run.kind === 'thegraph' && run.doneAt === null && run.route !== 'decision' && isAtRoute(run) ? onSkill(run, 'make-it', now) : run

export type StepState = 'done' | 'run' | 'wait' | 'todo'

/**
 * Where one planned step stands: its latest record decides, unless a step before
 * it in the plan began again since (check-it sending work back to make-it), which
 * leaves it to do once more.
 */
export const stateOf = (run: Run, key: string): StepState => {
  const rec = run.steps.findLast(s => s.key === key)
  if (!rec) return 'todo'
  const keys = plan(run.kind, run.route)
  const earlier = keys.slice(0, keys.indexOf(key))
  if (run.steps.some(s => earlier.includes(s.key) && s.startedAt > rec.startedAt)) return 'todo'
  if (rec.endedAt !== null) return 'done'
  return run.isWaiting || key === CONFIRM || key === DECIDE ? 'wait' : 'run'
}

// --- the run sheet ---------------------------------------------------------------

/** A run sheet's file name: `<repo>-<yyyymmdd>-<hhmm>-<8 hex>.md` in a `thegraph` folder. */
const SHEET_PATH = /[\\/]thegraph[\\/][^\\/]+-\d{8}-\d{4}-[0-9a-f]{8}\.md$/i
export const isSheetPath = (path: string): boolean => SHEET_PATH.test(path)

/**
 * The path a run's sheet gets: `<temp>/thegraph/<repo>-<yyyymmdd>-<hhmm>-<hex>.md`, in the
 * temp folder's own separator, the time as the engine's clock reads it locally.
 */
export const sheetPathFor = (tempDir: string, repo: string, now: number, hex: string): string => {
  const sep = tempDir.includes('\\') ? '\\' : '/'
  const d = new Date(now)
  const two = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`
  const name = repo.replace(/[^\w.-]+/g, '-') || 'repo'
  return `${tempDir.replace(/[\\/]+$/, '')}${sep}thegraph${sep}${name}-${stamp}-${hex}.md`
}

/** The line added to thegraph's text so the run writes where this plugin watches. */
export const sheetLine = (path: string): string => `\n\nThis run's run sheet: ${path}\n`

/** The last part of a path, either separator. */
export const baseName = (path: string): string => path.split(/[\\/]/).filter(Boolean).at(-1) ?? ''

/** The sheet's keys for the two stops, drawn in the line's own words. */
const SHEET_KEY: Record<string, string> = { confirm: CONFIRM, decide: DECIDE }
const SHEET_MARK: Record<string, SheetStep['mark']> = { ' ': 'todo', '~': 'doing', x: 'done', X: 'done' }

/** Reads a run sheet's text; lines it does not know are skipped. */
export const parseSheet = (path: string, text: string): Sheet => {
  const sheet: Sheet = { path, issue: null, source: null, route: null, steps: [], carried: [], children: [] }
  let section: 'carried' | 'children' | null = null
  for (const line of text.split(/\r?\n/)) {
    const field = /^(issue|source|route):\s*(.*\S)\s*$/.exec(line)
    const step = /^- \[([ ~xX])\]\s+(\S+)/.exec(line)
    const note = /^\s+→\s*(.*\S)\s*$/.exec(line)
    if (/^##\s/.test(line)) section = /^##\s+Carried\b/i.test(line) ? 'carried' : /^##\s+Children\b/i.test(line) ? 'children' : null
    else if (section === 'carried' && /^- /.test(line)) sheet.carried.push(line.slice(2).trim())
    else if (section === 'children' && /^- \S/.test(line)) {
      // Only the address before ` — ` is the panel's to read; the rest is the conductor's prose.
      const body = line.slice(2).trim()
      const at = body.indexOf(' — ')
      sheet.children.push({ address: at < 0 ? (body.split(/\s/)[0] ?? body) : body.slice(0, at).trim(), text: at < 0 ? '' : body.slice(at + 3) })
    }
    // A template placeholder (`<read-it's label ...>`) is no value yet.
    else if (field?.[1] === 'issue') sheet.issue = (field[2] ?? '').startsWith('<') ? null : (field[2] ?? null)
    else if (field?.[1] === 'route') sheet.route = (field[2] ?? '').startsWith('<') ? null : (field[2] ?? null)
    else if (field?.[1] === 'source') sheet.source = (field[2] ?? '').startsWith('<') ? null : (field[2] ?? null)
    else if (step) sheet.steps.push({ key: SHEET_KEY[step[2] ?? ''] ?? step[2] ?? '', mark: SHEET_MARK[step[1] ?? ' '] ?? 'todo', note: null })
    else if (note) {
      const last = sheet.steps[sheet.steps.length - 1]
      if (last) last.note = note[1] ?? null
    }
  }
  return sheet
}

/** The lines a newer reading of the sheet adds: steps begun, notes written, items carried, the end. */
export const sheetLog = (before: Sheet | null, after: Sheet, at: number): LogEntry[] => {
  const out: LogEntry[] = []
  const was = new Map((before?.steps ?? []).map(s => [s.key, s]))
  for (const step of after.steps) {
    const old = was.get(step.key)
    if (step.mark === 'doing' && old?.mark !== 'doing') out.push({ at, kind: 'step', text: step.key, detail: null })
    if (step.note !== null && step.note !== old?.note) out.push({ at, kind: 'note', text: step.note, detail: null })
  }
  const carried = new Set(before?.carried ?? [])
  for (const item of after.carried) if (!carried.has(item)) out.push({ at, kind: 'carry', text: item, detail: null })
  const isEnd = (sheet: Sheet | null) => sheet !== null && sheet.steps.length > 0 && sheet.steps.every(s => s.mark === 'done')
  if (isEnd(after) && !isEnd(before)) out.push({ at, kind: 'end', text: 'done', detail: null })
  return out
}

// --- the run's issue -------------------------------------------------------------

export type IssueRef = { kind: 'github'; repo: string | null; number: number } | { kind: 'file'; path: string }

/**
 * Where the sheet's `source:` says the issue lives: `owner/repo#42` or `#42` on GitHub,
 * else a file, a relative path taken from the session's folder. Null when there is none.
 */
export const issueOf = (source: string | null | undefined, cwd: string | null): IssueRef | null => {
  if (source == null || source === '') return null
  const gh = /^(?:([\w.-]+\/[\w.-]+))?#(\d+)$/.exec(source)
  if (gh) return { kind: 'github', repo: gh[1] ?? null, number: Number(gh[2]) }
  if (/^(?:[a-z]:[\\/]|[\\/])/i.test(source)) return { kind: 'file', path: source }
  if (cwd === null) return null
  const sep = cwd.includes('\\') ? '\\' : '/'
  return { kind: 'file', path: `${cwd.replace(/[\\/]+$/, '')}${sep}${source}` }
}

/**
 * What the panel calls the run: once the sheet names an issue, its number (or its file's
 * name) and the title after ` — `; the whole issue line when the sheet has no source;
 * before any of that, the label. Null for a run with none of them.
 */
export const runName = (run: Run): string | null => {
  const issue = run.sheet?.issue ?? null
  const source = run.sheet?.source ?? null
  if (issue === null) return run.label
  if (source === null) return issue
  const ref = issueOf(source, null)
  const front = ref?.kind === 'github' ? `#${ref.number}` : baseName(source).replace(/\.[^.]+$/, '')
  const at = issue.indexOf(' — ')
  const title = at < 0 ? '' : issue.slice(at + 3).trim()
  return title === '' ? front : `${front} ${title}`
}

/**
 * An issue's address as a short label: `#42` for a GitHub issue, an issue file's name
 * without its extension.
 */
export const issueLabelOf = (address: string): string => {
  const gh = /#(\d+)$/.exec(address)
  return gh ? `#${gh[1]}` : baseName(address).replace(/\.[^.]+$/, '')
}

/** An issue's slug, as thegraph-herdr names a worker after it: its number, or its file's name made safe and cut to 18. */
export const slugOf = (address: string): string => {
  const gh = /#(\d+)$/.exec(address)
  if (gh) return gh[1] ?? ''
  return issueLabelOf(address).toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 18)
}

/** The run id: the 8 hex digits that end a run sheet's name. */
export const runIdOf = (sheetPath: string | null): string | null =>
  sheetPath === null ? null : (/-([0-9a-f]{8})\.md$/i.exec(sheetPath)?.[1]?.toLowerCase() ?? null)

/** A worker terminal's name, `tg-<run id>-<slug>`, taken apart; null for any other name. */
export const workerOf = (name: unknown): { runId: string; slug: string } | null => {
  const m = typeof name === 'string' ? /^tg-([0-9a-f]{8})-([a-z0-9_-]{1,18})$/.exec(name) : null
  return m === null ? null : { runId: m[1] ?? '', slug: m[2] ?? '' }
}

/** Whether a file is this worker's brief: the run sheet's name without `.md`, then `.<slug>.brief.md`. */
export const isBriefOf = (path: string, runId: string, slug: string): boolean =>
  baseName(path).toLowerCase().endsWith(`-${runId}.${slug}.brief.md`)

/** A worker's brief, read as the sheet it stands in for: the `Issue:` line names the issue, its address before ` — ` the source. */
export const parseBrief = (path: string, text: string): Sheet => {
  const issue = /^Issue:\s*(.*\S)\s*$/m.exec(text)?.[1] ?? null
  const route = /^Route:\s*(.*\S)\s*$/m.exec(text)?.[1] ?? null
  const at = issue?.indexOf(' — ') ?? -1
  const source = issue === null ? null : at < 0 ? issue : issue.slice(0, at).trim()
  return { path, issue, source, route, steps: [], carried: [], children: [] }
}

/** The live, named terminals in `hc ls --json`'s answer; null for an answer that is not one. */
export const parseTerminals = (stdout: string): Terminal[] | null => {
  let data: unknown
  try {
    data = JSON.parse(stdout)
  } catch {
    return null
  }
  const list: unknown = Array.isArray(data) ? data : data !== null && typeof data === 'object' && 'terminals' in data ? data.terminals : null
  if (!Array.isArray(list)) return null
  return list.flatMap((t: unknown) => {
    if (t === null || typeof t !== 'object') return []
    const r = t as Record<string, unknown>
    return typeof r.address === 'string' && typeof r.name === 'string' && r.state !== 'finished'
      ? [{ address: r.address, name: r.name, status: typeof r.status === 'string' ? r.status : null }]
      : []
  })
}

/**
 * The conductor's children, each with where it stands: a live worker's status from hc
 * (and its terminal, to focus), else `done` where the sheet's line says so, else `waiting`.
 * With no `## Children` section, the workers found under the run id.
 */
export const childrenOf = (run: Run, terminals: readonly Terminal[]): Child[] => {
  const runId = runIdOf(run.sheetPath)
  if (run.kind !== 'herdr' || runId === null) return []
  const ours = terminals.filter(t => workerOf(t.name)?.runId === runId)
  const listed = run.sheet?.children ?? []
  if (listed.length === 0) {
    return ours.map(t => {
      const slug = workerOf(t.name)?.slug ?? ''
      return { label: /^\d+$/.test(slug) ? `#${slug}` : slug, state: liveState(t.status), address: t.address }
    })
  }
  return listed.map(c => {
    const t = ours.find(w => workerOf(w.name)?.slug === slugOf(c.address))
    if (t !== undefined) return { label: issueLabelOf(c.address), state: liveState(t.status), address: t.address }
    return { label: issueLabelOf(c.address), state: /\bdone\b/i.test(c.text) ? 'done' : 'waiting', address: null }
  })
}

/** A live worker's hc status as a child's state: `idle` (a question waiting on the person) still works. */
const liveState = (status: string | null): Child['state'] =>
  status === 'done' ? 'done' : status === 'blocked' || status === 'error' ? 'blocked' : 'working'

/** The keys of path-band's Buttons for the run: the chip, a child's worker, a worker's conductor. */
export const CHIP_KEY = 'thegraph'
export const WORKER_KEY = 'thegraph-worker-'
export const CONDUCTOR_KEY = 'thegraph-conductor'

const STEP_MARK: Record<StepState, string> = { done: ' ✓', run: ' ◐', wait: ' ◆', todo: '' }

/**
 * The run as path-band's chip draws it: the issue the branch's commits are for now (a
 * conductor's child whose live worker is not done, else a plain run's child its sheet marks
 * under way, else the sheet's issue by its number or file name, else the prompt's label),
 * the step at hand and its time, the children, a worker's way back.
 */
export const chipOf = (run: Run | null, terminals: readonly Terminal[], now: number): Chip | null => {
  if (run === null) return null
  const children = childrenOf(run, terminals)
  const live = children.find(c => c.address !== null && c.state !== 'done')
  // A plain cluster run's child in hand is the one its sheet's `## Children` marks under way.
  const underWay = run.kind === 'herdr' ? undefined : run.sheet?.children.find(c => /\bunder way\b/i.test(c.text))
  // An older sheet without `source:` names its issue at the front of its issue line.
  const named = underWay?.address ?? run.sheet?.source ?? run.sheet?.issue?.split(' — ')[0]?.trim() ?? null
  const issue = live?.label ?? (named ? issueLabelOf(named) : run.label || null)
  const done = isDone(run)
  const focus = focusOf(run)
  const ms = done || focus === null || focus.state === 'todo' ? null : stepMs(run, focus.key, now)
  return {
    // A run kept in state from before runs had a kind is a /thegraph run.
    head: run.kind ?? 'thegraph',
    issue,
    step: done ? 'done' : focus === null ? null : `${focus.key}${STEP_MARK[focus.state]}`,
    time: ms === null ? null : minutes(ms),
    children,
    conductor: run.kind === 'worker' ? (run.herd?.conductor ?? null) : null,
  }
}

/** What a press on one of path-band's Buttons asks of this plugin, by its key and the chip it was drawn from. */
export const pressOf = (element: string, chip: Chip | null): { kind: 'pane' } | { kind: 'focus'; address: string } | null => {
  if (chip === null) return null
  if (element === CHIP_KEY) return { kind: 'pane' }
  if (element === CONDUCTOR_KEY) return chip.conductor === null ? null : { kind: 'focus', address: chip.conductor }
  if (!element.startsWith(WORKER_KEY)) return null
  const address = element.slice(WORKER_KEY.length)
  return chip.children.some(c => c.address === address) ? { kind: 'focus', address } : null
}

/** What a shell command reports to the conductor: `hc send <t> "done …"`, `stuck` or `question`; null for any other. */
export const reportOf = (command: string): 'done' | 'stuck' | 'question' | null => {
  const word = /\bhc\s+send\s+\S+\s+["']?(done|stuck|question)\b/.exec(command)?.[1]
  return word === 'done' || word === 'stuck' || word === 'question' ? word : null
}

/** Whether a shell command closes issue `n` with gh: `gh issue close 42`, `#42`, or its URL. */
export const closesIssue = (command: string, n: number): boolean =>
  [...command.matchAll(/\bgh\s+issue\s+close\s+(?:\S*\/issues\/|#)?(\d+)\b/g)].some(m => Number(m[1]) === n)

/** Whether an issue file's `Status:` line says it is finished. */
export const isClosedStatus = (text: string): boolean => /^\s*Status:\s*(done|closed|resolved|archived|wontfix)\b/im.test(text)

/** The test runner a shell command calls, by name; null for any other command. */
const TEST_RUNNER = /\b(vitest|jest|pytest|cargo test|go test|bun test|deno test|(?:npm|pnpm|yarn)(?: run)? test|claude plugin test|check-mods|flutter test|dotnet test|gradle test|mvn test)\b/
export const testOf = (command: string): string | null => TEST_RUNNER.exec(command)?.[1] ?? null

/** `48 pass · 2 fail`, from what a runner printed; null when it printed neither count. */
export const testCounts = (output: string): string | null => {
  const pass = /(\d+)\s+pass(?:ed|ing)?\b/i.exec(output)?.[1]
  const fail = /(\d+)\s+fail(?:ed|ing|ures?)?\b/i.exec(output)?.[1]
  const parts = [pass === undefined ? null : `${pass} pass`, fail === undefined || fail === '0' ? null : `${fail} fail`].filter(p => p !== null)
  return parts.length === 0 ? null : parts.join(' · ')
}

// --- the gantt ---------------------------------------------------------------------------

/** Each step's colour: its bar on the gantt, its name in a turn's closing line. */
export const STEP_COLOR: Record<string, string> = {
  'read-it': 'cyan', [CONFIRM]: 'warning', [WORKERS]: 'blue', 'make-it': 'claude', 'check-it': 'success', 'ask-it': 'magenta', lens: 'blue', [DECIDE]: 'warning',
}

/**
 * The gantt: a row per step in the plan, `width` cells across the run from its start to
 * `now`, a cell filled wherever that step ran; a step begun twice fills two stretches.
 * `ms` is its time over every run, null for one not begun.
 */
export const gantt = (run: Run, now: number, width: number): { key: string; state: StepState; cells: boolean[]; ms: number | null }[] => {
  const end = Math.max(now, run.startedAt + 1)
  const per = (end - run.startedAt) / width
  return stepsOf(run).map(({ key, state }) => {
    const recs = run.steps.filter(s => s.key === key)
    const cells = Array.from({ length: width }, (_, i) => {
      const from = run.startedAt + i * per
      return recs.some(s => s.startedAt < from + per && (s.endedAt ?? end) > from)
    })
    return { key, state, cells, ms: stepMs(run, key, end) }
  })
}

/** The step a moment of the run fell in, `#2` on its second time round; null before any. */
export const stepAt = (run: Run, at: number): string | null => {
  const i = run.steps.findLastIndex(s => s.startedAt <= at)
  const rec = run.steps[i]
  if (rec === undefined) return null
  const round = run.steps.slice(0, i + 1).filter(s => s.key === rec.key).length
  return round > 1 ? `${rec.key} #${round}` : rec.key
}

// --- the conversation's lines ------------------------------------------------------------

/** What a stretch of the log did, as the turn's closing line carries it: the step, then counts. */
export const turnSummary = (log: readonly LogEntry[], since: number, step: string | null): Seg[] => {
  const part = log.filter(l => l.at >= since)
  const edits = part.filter(l => l.kind === 'edit').length
  const test = part.findLast(l => l.kind === 'test')
  const asks = part.filter(l => l.kind === 'ask').length
  const signals = part.filter(l => l.kind === 'signal').length
  const segs: Seg[] = [{ text: ' · thegraph ', color: null }]
  if (step !== null) segs.push({ text: step, color: STEP_COLOR[step] ?? null })
  if (edits > 0) segs.push({ text: `  ✎${edits}`, color: 'blue' })
  if (test) segs.push({ text: `  ${test.isOk ? '✓' : '✗'}${test.detail === null ? '' : ` ${test.detail}`}`, color: test.isOk ? 'success' : 'error' })
  if (asks > 0) segs.push({ text: `  ◆${asks}`, color: 'warning' })
  if (signals > 0) segs.push({ text: `  ⚑${signals}`, color: 'magenta' })
  return segs
}

/** Every step's place: from the run sheet once there is one, else from the events. */
export const stepsOf = (run: Run): { key: string; state: StepState }[] => {
  const sheet = run.sheet
  if (sheet === null || sheet.steps.length === 0) return plan(run.kind, run.route).map(key => ({ key, state: stateOf(run, key) }))
  const steps = sheet.steps.map(s => ({ key: s.key, state: (s.mark === 'done' ? 'done' : s.mark === 'doing' ? 'run' : 'todo') as StepState }))
  // The sheet cannot say that the person holds the move; the events can.
  if (run.isWaiting) {
    const at = steps.findIndex(s => s.state === 'run')
    const stop = steps[at >= 0 ? at : steps.findIndex(s => s.state === 'todo')]
    if (stop) stop.state = 'wait'
  }
  return steps
}

/** Whether the run is over: its events said so, or every step on its sheet is checked. */
export const isDone = (run: Run): boolean =>
  run.doneAt !== null || (run.sheet !== null && run.sheet.steps.length > 0 && run.sheet.steps.every(s => s.mark === 'done'))

/**
 * The step the chip and the spinner name: the one running or waiting, else the next one to do;
 * null once the run is done. `index` is its place in the plan, from 0.
 */
export const focusOf = (run: Run): { key: string; index: number; state: StepState } | null => {
  if (isDone(run)) return null
  const steps = stepsOf(run)
  const at = steps.findIndex(s => s.state === 'run' || s.state === 'wait')
  const index = at >= 0 ? at : steps.findIndex(s => s.state === 'todo')
  const step = steps[index]
  return step === undefined ? null : { key: step.key, index, state: step.state }
}

/** A step's name as drawn: a step that waits on the person says so. */
export const stepLabel = (key: string, state: StepState): string => (state === 'wait' ? `${key} · waiting` : key)

/** Milliseconds a step took, or has taken so far, over every time it ran. */
export const stepMs = (run: Run, key: string, now: number): number | null => {
  const recs = run.steps.filter(s => s.key === key)
  if (recs.length === 0) return null
  return recs.reduce((ms, s) => ms + ((s.endedAt ?? now) - s.startedAt), 0)
}

export const minutes = (ms: number): string => (ms < 60_000 ? '<1m' : `${Math.round(ms / 60_000)}m`)

/** `firsthand×2 lens`, in the order each first fired. */
export const signalSummary = (run: Run): string => {
  const counts = new Map<string, number>()
  for (const s of run.signals) counts.set(s.skill, (counts.get(s.skill) ?? 0) + 1)
  return [...counts].map(([k, n]) => (n > 1 ? `${k}×${n}` : k)).join(' ')
}

/** A turn's key: its duration, the only id its closing line carries. A bare number
 *  would be an integer key, which objects order by size rather than by insertion. */
const turnKey = (durationMs: number) => `ms${durationMs}`

/** A turn's closing line, the latest `max` kept. */
export const keepTurnLine = <T>(lines: Record<string, T>, durationMs: number, line: T, max: number): Record<string, T> => {
  const key = turnKey(durationMs)
  return Object.fromEntries([...Object.entries(lines).filter(([k]) => k !== key), [key, line] as const].slice(-max))
}

export const turnLineOf = <T>(lines: Record<string, T>, durationMs: number): T | undefined => lines[turnKey(durationMs)]
