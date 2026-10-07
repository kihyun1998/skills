import type { Route, Run, Sheet, SheetStep, StepRec } from '../types'

/** The stops where a person answers: after read-it, and after lens. */
export const CONFIRM = '확인'
export const DECIDE = '결정'

/** Skills that are steps of the order; anything else thegraph calls is ignored. */
const STEP_SKILLS = ['read-it', 'lens', 'make-it', 'check-it', 'ask-it']

/** Skills that interrupt the order whenever their moment comes. */
export const SIGNAL_SKILLS = ['redden', 'firsthand', 'boundary']

/** The steps a route walks; before the route is known, the build one. */
export const plan = (route: Route | null): string[] =>
  route === 'decision' ? ['read-it', CONFIRM, 'lens', DECIDE] : ['read-it', CONFIRM, 'make-it', 'check-it', 'ask-it']

/** How the pane names a route: read-it says prose or code only in its text, which no event carries. */
export const routeName = (route: Route): string => (route === 'decision' ? 'open decision' : 'prose/code')

/** `/thegraph #42 band redraw` → `#42 band redraw`; null for a prompt that does not start one. */
export const labelOf = (text: string): string | null => {
  const m = /^\/thegraph(?![\w-])\s*(.*)$/s.exec(text.trim())
  if (!m) return null
  const rest = (m[1] ?? '').split('\n')[0]?.trim() ?? ''
  return rest === '' ? '' : [...rest].slice(0, 40).join('')
}

export const startRun = (label: string | null, now: number): Run => ({
  label: label === '' ? null : label,
  startedAt: now,
  route: null,
  steps: [],
  signals: [],
  isWaiting: false,
  doneAt: null,
  sheetPath: null,
  sheet: null,
})

const openStep = (run: Run): StepRec | undefined => run.steps.find(s => s.endedAt === null)
const closeAll = (steps: StepRec[], now: number) => steps.map(s => (s.endedAt === null ? { ...s, endedAt: now } : s))
const begin = (run: Run, key: string, now: number): StepRec[] => [...closeAll(run.steps, now), { key, startedAt: now, endedAt: null }]

/** Right after the confirm stop, nothing begun since: where thegraph picks its route. */
const isAtRoute = (run: Run) => openStep(run) === undefined && run.steps.at(-1)?.key === CONFIRM

/** A skill was expanded while the run is open. */
export const onSkill = (run: Run, skill: string, now: number): Run => {
  if (run.doneAt !== null) return run
  if (SIGNAL_SKILLS.includes(skill)) return { ...run, signals: [...run.signals, { skill, at: now }] }
  if (!STEP_SKILLS.includes(skill)) return run
  if (skill === 'lens') {
    // check-it runs lens on every change: only a lens at the route is the open-decision step.
    if (run.route === 'decision' || (run.route === null && isAtRoute(run))) {
      return { ...run, route: 'decision', isWaiting: false, steps: begin(run, skill, now) }
    }
    return run
  }
  const route: Route | null = skill === 'read-it' ? run.route : (run.route ?? 'build')
  return { ...run, route, isWaiting: false, steps: begin(run, skill, now) }
}

/**
 * The move passed to the person: a main-thread turn ended, or a question
 * (AskUserQuestion) went up within one. Whatever runs now waits on them.
 */
export const onTurnEnd = (run: Run, now: number): Run => {
  if (run.doneAt !== null) return run
  const open = openStep(run)
  if (open?.key === 'read-it') return { ...run, isWaiting: true, steps: begin(run, CONFIRM, now) }
  if (open?.key === 'lens') return { ...run, isWaiting: true, steps: begin(run, DECIDE, now) }
  // Anything else, a trivial end after the confirm included, is the person's to say: the run waits, and × ends it.
  return { ...run, isWaiting: true }
}

/** The person answered: a prompt of their own, or a question's reply. Null once a finished run has been moved on from. */
export const onAnswer = (run: Run, now: number): Run | null => {
  if (run.doneAt !== null) return null
  if (!run.isWaiting) return run
  const open = openStep(run)
  if (open?.key === CONFIRM) return { ...run, isWaiting: false, steps: closeAll(run.steps, now) }
  if (open?.key === DECIDE || open?.key === 'ask-it') {
    return { ...run, isWaiting: false, steps: closeAll(run.steps, now), doneAt: now }
  }
  return { ...run, isWaiting: false }
}

/**
 * A main-thread file edit. Right after the confirm, with nothing begun, it is
 * make-it's work started without its skill being expanded: an inference, so it
 * only ever opens make-it there, and never on the decision route.
 */
export const onEdit = (run: Run, now: number): Run =>
  run.doneAt === null && run.route !== 'decision' && isAtRoute(run) ? onSkill(run, 'make-it', now) : run

export type StepState = 'done' | 'run' | 'wait' | 'todo'

/**
 * Where one planned step stands: its latest record decides, unless a step before
 * it in the plan began again since (check-it sending work back to make-it), which
 * leaves it to do once more.
 */
export const stateOf = (run: Run, key: string): StepState => {
  const rec = run.steps.findLast(s => s.key === key)
  if (!rec) return 'todo'
  const keys = plan(run.route)
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
  const sheet: Sheet = { path, issue: null, route: null, steps: [], carried: [] }
  let isCarried = false
  for (const line of text.split(/\r?\n/)) {
    const field = /^(issue|route):\s*(.*\S)\s*$/.exec(line)
    const step = /^- \[([ ~xX])\]\s+(\S+)/.exec(line)
    const note = /^\s+→\s*(.*\S)\s*$/.exec(line)
    if (/^##\s/.test(line)) isCarried = /^##\s+Carried\b/i.test(line)
    else if (isCarried && /^- /.test(line)) sheet.carried.push(line.slice(2).trim())
    else if (field?.[1] === 'issue') sheet.issue = field[2] ?? null
    // A template placeholder (`<read-it's label ...>`) is no route yet.
    else if (field?.[1] === 'route') sheet.route = (field[2] ?? '').startsWith('<') ? null : (field[2] ?? null)
    else if (step) sheet.steps.push({ key: SHEET_KEY[step[2] ?? ''] ?? step[2] ?? '', mark: SHEET_MARK[step[1] ?? ' '] ?? 'todo', note: null })
    else if (note) {
      const last = sheet.steps[sheet.steps.length - 1]
      if (last) last.note = note[1] ?? null
    }
  }
  return sheet
}

/** Every step's place: from the run sheet once there is one, else from the events. */
export const stepsOf = (run: Run): { key: string; state: StepState }[] => {
  const sheet = run.sheet
  if (sheet === null || sheet.steps.length === 0) return plan(run.route).map(key => ({ key, state: stateOf(run, key) }))
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
 * The step the line names: the one running or waiting, else the next one to do;
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
export const stepLabel = (key: string, state: StepState): string => (state === 'wait' ? `${key} 대기` : key)

/** Milliseconds a step took, or has taken so far, over every time it ran. */
export const stepMs = (run: Run, key: string, now: number): number | null => {
  const recs = run.steps.filter(s => s.key === key)
  if (recs.length === 0) return null
  return recs.reduce((ms, s) => ms + ((s.endedAt ?? now) - s.startedAt), 0)
}

export const minutes = (ms: number): string => (ms < 60_000 ? '<1m' : `${Math.round(ms / 60_000)}m`)

/** `redden×2 firsthand`, in the order each first fired. */
export const signalSummary = (run: Run): string => {
  const counts = new Map<string, number>()
  for (const s of run.signals) counts.set(s.skill, (counts.get(s.skill) ?? 0) + 1)
  return [...counts].map(([k, n]) => (n > 1 ? `${k}×${n}` : k)).join(' ')
}
