import type { Route, Run, StepRec } from '../types'

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

/**
 * The step the line names: the one running or waiting, else the next one to do;
 * null once the run is done. `index` is its place in the plan, from 0.
 */
export const focusOf = (run: Run): { key: string; index: number; state: StepState } | null => {
  if (run.doneAt !== null) return null
  const keys = plan(run.route)
  const states = keys.map(key => stateOf(run, key))
  const at = states.findIndex(s => s === 'run' || s === 'wait')
  const index = at >= 0 ? at : states.indexOf('todo')
  const key = keys[index]
  const state = states[index]
  return key === undefined || state === undefined ? null : { key, index, state }
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
