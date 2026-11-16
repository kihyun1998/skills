import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Chip, Run } from '../types'

import { CONFIRM, DECIDE, CHIP_KEY, CONDUCTOR_KEY, WORKER_KEY, addLog, chipOf, gantt, isDone, pressOf, stepAt, turnSummary, isSheetPath, sheetLog, testCounts, testOf, labelOf, onAnswer, onEdit, onSkill, parseSheet, stepsOf, onTurnEnd, signalSummary, startRun, stateOf, keepTurnLine, turnLineOf } from '../hooks/run'

const MIN = 60_000

const PANE_PROPS = {
  title: 'thegraph',
  isFocused: false,
  bodyColumns: 38,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 20 },
  view: {},
}

const start = async ($: Engine, on: On) => {
  const clock = mock.clock(on)
  watch($, on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('skill.prompt', (_$, e) => ({ text: e.text }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  // Another plugin's band beneath this one, as usage-band would draw.
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', props: {}, children: ['BELOW'] }))
  // The engine's spinner and turn line, drawn from the props they were handed.
  on('ui.render', { component: 'Spinner' }, (_$, e) => ({ type: 'Text', props: {}, children: [`${e.props.word}${e.props.suffix}`] }))
  on('ui.render', { component: 'TurnDuration' }, (_$, e) => ({ type: 'Text', props: {}, children: [`${e.props.word} for ${e.props.durationMs}ms`] }))
  await $.session.start({ cwd: '/w', surface: 'terminal', isInteractive: true })
  await clock.settle()
  return clock
}

// A run sheet as thegraph's template writes it, part way through a prose run.
const SHEET = 'C:\\Users\\u\\AppData\\Local\\Temp\\thegraph\\penterm-20261007-1542-7f3a9c2e.md'
const sheetText = (makeIt: ' ' | '~' | 'x', source?: string) => [
  '# thegraph run sheet',
  'issue: .scratch/settings/issues/03-row-height.md — 설정 행 높이 통일',
  ...(source === undefined ? [] : [`source: ${source}`]),
  'repo: D:\\github\\penterm',
  'route: prose',
  '',
  '- [x] read-it',
  '  → make-it: 삭제 확인창은 예전처럼 둠',
  '- [x] confirm',
  `- [${makeIt}] make-it`,
  '  → check-it: 문서만 바뀜, prose 검사만',
  `- [${makeIt === 'x' ? 'x' : ' '}] check-it`,
  `- [${makeIt === 'x' ? 'x' : ' '}] ask-it`,
  '',
  '## Carried',
  '- 단축키 표 문구가 SPEC과 다름',
].join('\n')

// The files a run's tools write, as fs.stat and fs.read see them: each write a newer modification time.
// Matched by file name, since the engine resolves a path for its own OS.
const sheetFiles = (on: On) => {
  const files = new Map<string, { text: string; mtime: number }>()
  let writes = 0
  const nameOf = (path: string) => path.split(/[\\/]/).at(-1)
  const find = (path: string) => [...files].find(([k]) => nameOf(k) === nameOf(path))?.[1]
  on('fs.stat', (_$, e) => {
    const f = find(e.path)
    if (f === undefined) throw new Error(`ENOENT: ${e.path}`)
    return { value: { kind: 'file' as const, size: f.text.length, mtimeMs: f.mtime, isLink: false } }
  })
  on('fs.read', (_$, e) => ({ value: find(e.path)?.text ?? '' }))
  return {
    write: (path: string, text: string) => void files.set(path, { text, mtime: ++writes }),
    remove: (path: string) => void files.delete([...files.keys()].find(k => nameOf(k) === nameOf(path)) ?? path),
  }
}

// The surface's panes, as the engine keeps them: open, close and list, and how the last one was opened.
const paneHost = (on: On) => {
  const panes = new Set<string>()
  const opened: { closeOnEscape?: true }[] = []
  on('ui.open', (_$, e) => {
    panes.add(e.id)
    opened.push({ closeOnEscape: e.closeOnEscape })
    return { value: { isPlaced: true as const } }
  })
  on('ui.close', (_$, e) => {
    panes.delete(e.id)
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: [...panes].map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })) }))
  return { panes, opened }
}

const say = ($: Engine, text: string) => $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
const skill = ($: Engine, name: string) => $.skill.prompt({ skill: name, text: '' })
const endTurn = ($: Engine) =>
  $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })

const isButton = (n: unknown): n is { props: { label: string } } =>
  n !== null && typeof n === 'object' && 'type' in n && n.type === 'Button'

// A drawn tree's text, its string children joined in order.
const flat = (node: unknown): string =>
  typeof node === 'string'
    ? node
    : isButton(node)
      ? `[ ${node.props.label} ]`
      : node !== null && typeof node === 'object' && 'children' in node && Array.isArray(node.children)
      ? node.children.map(flat).join('')
      : ''

// How the innermost line whose text starts with `start` wraps: the `wrap` prop it was drawn with.
const wrapOf = (node: unknown, start: string): unknown => {
  if (node === null || typeof node !== 'object' || !('children' in node) || !Array.isArray(node.children)) return undefined
  for (const child of node.children) {
    const found = wrapOf(child, start)
    if (found !== undefined) return found
  }
  const props = 'props' in node ? (node.props as Record<string, unknown>) : {}
  return flat(node).startsWith(start) && 'wrap' in props ? props.wrap : undefined
}

// What the panel last wrote to its state, by key: the run, and the chip path-band draws from it.
const written = new WeakMap<Engine, Map<string, unknown>>()
const watch = ($: Engine, on: On) => {
  const seen = new Map<string, unknown>()
  written.set($, seen)
  on('state.set', (_$, e, next) => {
    if (e.plugin === 'thegraph-panel') seen.set(e.key, 'value' in e ? e.value : undefined)
    return next(e)
  })
}
const lastRun = ($: Engine) => (written.get($)?.get('run') ?? null) as Run | null
const lastChip = ($: Engine) => (written.get($)?.get('chip') ?? null) as Chip | null

const MARK = { done: ' ✓', run: ' ◐', wait: ' ◆', todo: '' } as const

// The run as one line: the chip as path-band draws it from the panel's value (the children's states
// spelled out, a worker's way back by its terminal), then every step in order with its mark, a step
// begun twice counted, and `done` at the end; `BELOW` with no run, as the band beneath shows alone.
const lineOf = ($: Engine): string => {
  const r = lastRun($)
  const c = lastChip($)
  if (r === null || c === null) return 'BELOW'
  const chip = [c.head, c.issue, c.step, c.time].filter(w => w !== null && w !== '').join(' ')
  const kids = c.children.map(k => (k.address === null ? ` ${k.label} ${k.state}` : ` [ ${k.label} ${k.state} ]`)).join('')
  const back = c.conductor === null ? '' : ` [ ↩ ${c.conductor} ]`
  const steps = stepsOf(r).map(({ key, state }) => {
    const n = r.steps.filter(x => x.key === key).length
    return `${key}${n > 1 ? `×${n}` : ''}${MARK[state]}`
  })
  return `[ ${chip} ]${kids}${back}  ${steps.join(' › ')}${isDone(r) ? '  done' : ''}`
}
const band = async ($: Engine) => ({ drawn: async () => lineOf($) })

describe('turn lines', () => {
  test('keep the latest turns, not the longest, and a repeated duration moves to the end', () => {
    let lines: Record<string, string> = {}
    for (const ms of [5000, 20, 999]) lines = keepTurnLine(lines, ms, `line ${ms}`, 2)
    expect(turnLineOf(lines, 5000)).toBe(undefined)
    expect(turnLineOf(lines, 20)).toBe('line 20')
    expect(turnLineOf(lines, 999)).toBe('line 999')
    lines = keepTurnLine(lines, 20, 'again', 2)
    lines = keepTurnLine(lines, 7, 'line 7', 2)
    expect(turnLineOf(lines, 999)).toBe(undefined)
    expect(turnLineOf(lines, 20)).toBe('again')
    expect(turnLineOf(lines, 7)).toBe('line 7')
    // A duration seen again counts as the newest, so the oldest other line goes first.
    let three: Record<string, string> = {}
    for (const ms of [20, 999, 20, 7, 8]) three = keepTurnLine(three, ms, `line ${ms}`, 3)
    expect(turnLineOf(three, 20)).toBe('line 20')
    expect(turnLineOf(three, 999)).toBe(undefined)
  })
})

describe('thegraph-panel', () => {
  test('a run kept in state from before runs had a kind is followed as /thegraph, its chip written at the reload', async ($, on) => {
    // The state a reload keeps, written by the version before kinds: no `kind`, `herd` or `reported`.
    const { kind: _kind, herd: _herd, reported: _reported, ...old } = { ...startRun('#7', 0), steps: [{ key: 'read-it', startedAt: 0, endedAt: null }] }
    // Until the panel writes a run of its own, a read of it answers the kept one.
    const isKept = () => !(written.get($)?.has('run') ?? false)
    on('state.get', (_$, e, next) => (isKept() && e.plugin === 'thegraph-panel' && e.key === 'run' ? { value: { value: old as Run, version: 1 } } : next(e)))
    await start($, on)
    expect(lastChip($)).toMatchObject({ head: 'thegraph', issue: '#7', step: 'read-it ◐' })
  })

  test('draws nothing until /thegraph runs', async ($, on) => {
    await start($, on)
    const ui = await band($)
    expect(flat(await ui.drawn())).toBe('BELOW')
  })

  test('walks the code route: read-it, the confirm stop, make-it with a signal', async ($, on) => {
    const clock = await start($, on)
    const ui = await band($)
    await say($, '/thegraph #42 band redraw')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    expect(flat(await ui.drawn())).toContain('[ thegraph #42 band redraw read-it ◐ <1m ]  read-it ◐ › confirm › make-it › check-it › ask-it')

    await clock.advance(3 * MIN)
    await endTurn($)
    expect(flat(await ui.drawn())).toContain('read-it ✓ › confirm ◆ › make-it')

    // A slash command while it waits is not the answer.
    await say($, '/context')
    expect(flat(await ui.drawn())).toContain('read-it ✓ › confirm ◆ › make-it')
    await say($, '맞아, 진행해')
    // Answered, and nothing begun yet: nothing runs, so no step is marked under way.
    expect(flat(await ui.drawn())).toContain('confirm ✓ › make-it › check-it')
    expect(flat(await ui.drawn())).not.toContain('◐')
    await skill($, 'make-it')
    await skill($, 'firsthand')
    await skill($, 'firsthand')
    const text = flat(await ui.drawn())
    expect(text).toContain('[ thegraph #42 band redraw make-it ◐ <1m ]  ')
    expect(text).toContain('make-it ◐ › check-it › ask-it')
    expect(lastRun($)?.signals.length).toBe(2)
    // The clock's tick moves the chip's minutes in the step while nothing else happens.
    await clock.advance(12 * MIN)
    expect(flat(await ui.drawn())).toContain('make-it ◐ 12m ]')
  })

  test('a confirm asked in a question box waits, and its reply answers it; an edit then begins make-it', async ($, on) => {
    // What the line said while the question was up, then the person's reply as the engine hands it back.
    const seen: string[] = []
    let ui: { drawn: () => Promise<unknown> } | null = null
    on('tool.call', { tool: 'AskUserQuestion' }, async () => {
      if (ui) seen.push(flat(await ui.drawn()))
      return { result: { questions: [], answers: { '맞나요?': '이대로 진행' } } }
    })
    on('tool.call', { tool: 'Edit' }, () => ({ result: { filePath: '/w/a.ts', oldString: 'a', newString: 'b', originalFile: 'a', structuredPatch: [], userModified: false, replaceAll: false } }))
    await start($, on)
    ui = await band($)
    await say($, '/thegraph #13')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await $.tool.call({ tool: 'AskUserQuestion', questions: [{ question: '맞나요?', header: '확인', options: [], multiSelect: false }] })
    expect(seen[0]).toContain('read-it ✓ › confirm ◆ › make-it')
    expect(flat(await ui.drawn())).toContain('confirm ✓ › make-it › check-it')
    await $.tool.call({ tool: 'Edit', file_path: '/w/a.ts', old_string: 'a', new_string: 'b' })
    expect(flat(await ui.drawn())).toContain('make-it ◐ › check-it')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    const log = flat(await pane.drawn())
    expect(log).toContain('◆ 맞나요? → 이대로 진행')
    expect(log).toContain('✎ a.ts')
    // Oldest first: the question comes before the step it let begin.
    expect(log.indexOf('◆ 맞나요?')).toBeLessThan(log.indexOf('▸ make-it'))
  })

  test('a test run in the shell goes in the log with its counts, passed or failed', async ($, on) => {
    let isError = false
    on('tool.call', { tool: 'Bash' }, () => {
      const result = { stdout: isError ? 'Tests  2 failed | 46 passed' : 'Tests  48 passed', stderr: '', interrupted: false }
      // A failing command comes back marked as an error; a passing one is not marked at all.
      return isError ? { result, isError: true as const } : { result }
    })
    await start($, on)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await $.tool.call({ tool: 'Bash', command: 'npx vitest run src/settings' })
    isError = true
    await $.tool.call({ tool: 'Bash', command: 'npx vitest run src/settings' })
    // Not a test: not in the log.
    await $.tool.call({ tool: 'Bash', command: 'git status' })
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    const log = flat(await pane.drawn())
    expect(log).toContain('✓ vitest 48 pass')
    expect(log).toContain('✗ vitest 46 pass · 2 fail')
    expect(log).not.toContain('git status')
  })

  test('a sheet the run names and writes itself is followed and read back, and the chip and pane draw from it', async ($, on) => {
    const fs = sheetFiles(on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~') })
    // make-it was never expanded; the sheet says it is under way.
    expect(flat(await ui.drawn())).toContain('make-it ◐ › check-it')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    const text = flat(await pane.drawn())
    expect(text).toContain('설정 행 높이 통일')
    expect(text).toContain('→ check-it: 문서만 바뀜, prose 검사만')
    expect(text).toContain('thegraph .scratch/settings/issues/03-row-height.md — 설정 행 높이 통일 · prose')
    expect(text).toContain('↗ 단축키 표 문구가 SPEC과 다름')
    // Every step checked off is the end, whatever the events saw.
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('x') })
    expect(flat(await ui.drawn())).toContain('ask-it ✓  done')
    expect(flat(await pane.drawn())).toMatch(/설정 행 높이 통일 · prose · \S+ · done/)
  })

  test('thegraph is told where its run sheet is, and a sheet written there by any tool is read', async ($, on) => {
    const fs = sheetFiles(on)
    on('process.run', () => ({ value: { exitCode: 0, stdout: '/tmp\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
    on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false, isImage: false } }))
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    const told = (await $.skill.prompt({ skill: 'thegraph', text: 'BODY' })).text
    const path = /This run's run sheet: (\S+)/.exec(told)?.[1] ?? ''
    expect(told.startsWith('BODY')).toBe(true)
    expect(isSheetPath(path)).toBe(true)
    expect(path.startsWith('/tmp/thegraph/w-')).toBe(true)
    // Written by the shell, as a run in bypass mode writes it; read once any tool call has run.
    fs.write(path, sheetText('~'))
    await $.tool.call({ tool: 'Bash', command: `sed -i 's/x/y/' ${path}` })
    expect(flat(await ui.drawn())).toContain('make-it ◐ › check-it')
    // Another session's sheet in the same folder, newer and finished, is not this run's.
    fs.write('/tmp/thegraph/w-20261008-0000-deadbeef.md', sheetText('x'))
    await $.tool.call({ tool: 'Bash', command: 'true' })
    expect(flat(await ui.drawn())).toContain('make-it ◐ › check-it')
    // The next shell write to this run's sheet is read again.
    fs.write(path, sheetText('x'))
    await $.tool.call({ tool: 'Bash', command: `sed -i 's/y/z/' ${path}` })
    expect(flat(await ui.drawn())).toContain('ask-it ✓  done')
  })

  test('the pane closes itself: its own button, and the keys named on the main screen', async ($, on) => {
    const host = paneHost(on)
    await start($, on)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    host.panes.add('thegraph')
    const pane = await $.ui.mount({
      plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS,
      viewport: { columns: 145, rows: 40, isFullscreen: false },
    })
    expect(flat(await pane.drawn())).toContain('[ close ] ^x x')
    await pane.press({ key: 'close' })
    expect([...host.panes]).toEqual([])
  })

  test('a pane left open with no run says so, offers its close, and goes at the next prompt', async ($, on) => {
    const host = paneHost(on)
    await start($, on)
    // As /clear leaves it: the engine's pane open, this plugin's run gone.
    host.panes.add('thegraph')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    expect(flat(await pane.drawn())).toContain('thegraph is not running.')
    expect(flat(await pane.drawn())).toContain('[ close ]')
    await say($, '다른 일 하자')
    expect([...host.panes]).toEqual([])
  })

  test("the spinner and each turn's closing line carry where the run is and what the turn did", async ($, on) => {
    await start($, on)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    const spinner = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Spinner', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' } })
    expect(flat(await spinner.drawn())).toBe('Sauteing… · thegraph read-it 1/5')
    await endTurn($)
    // The closing line of that turn (durationMs 1), and one from before the run, untouched.
    const line = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs: 1 } })
    expect(flat(await line.drawn())).toBe('Baked for 1ms · thegraph read-it')
    const other = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs: 999 } })
    expect(flat(await other.drawn())).toBe('Baked for 999ms')
  })

  test('the pane draws a bar per step over the run, then the whole log as a table', async ($, on) => {
    await start($, on)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    for (const sk of ['read-it', 'firsthand', 'firsthand', 'firsthand', 'firsthand', 'firsthand', 'firsthand', 'firsthand']) await skill($, sk)
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    const text = flat(await pane.drawn())
    // read-it has run the whole time so far; nothing else has begun.
    expect(text).toMatch(/read-it +█+ +<1m/)
    expect(text).toMatch(/make-it +·+ +–/)
    expect(text).toContain('time step       what')
    // The step names its first row; the rows under it carry a rule.
    expect(text).toContain('read-it    ▸ read-it')
    expect(text).toContain('│          ⚑ firsthand')
    // Nine lines logged, every one of them drawn.
    expect((text.match(/⚑ firsthand/g) ?? []).length).toBe(7)
  })

  test("path-band's buttons press through to the pane and to the terminals the chip names, nothing else", async ($, on) => {
    await start($, on)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    const chip = lastChip($)
    expect(pressOf(CHIP_KEY, chip)).toEqual({ kind: 'pane' })
    // A plain run has no children and no conductor: their keys are no press of this plugin's.
    expect(pressOf(CONDUCTOR_KEY, chip)).toBe(null)
    expect(pressOf(`${WORKER_KEY}t30`, chip)).toBe(null)
    expect(pressOf('dismiss', chip)).toBe(null)
    expect(pressOf(CHIP_KEY, null)).toBe(null)
    const herd = { ...(chip as Chip), children: [{ label: '#38', state: 'working' as const, address: 't30' }, { label: '#39', state: 'waiting' as const, address: null }], conductor: 't2x' }
    expect(pressOf(`${WORKER_KEY}t30`, herd)).toEqual({ kind: 'focus', address: 't30' })
    expect(pressOf(`${WORKER_KEY}t31`, herd)).toBe(null)
    expect(pressOf(CONDUCTOR_KEY, herd)).toEqual({ kind: 'focus', address: 't2x' })
  })

  test('a finished run stays until the next prompt, then the chip goes', async ($, on) => {
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await endTurn($)
    await say($, 'ok')
    await skill($, 'make-it')
    await skill($, 'check-it')
    await skill($, 'ask-it')
    await endTurn($)
    expect(flat(await ui.drawn())).toContain('check-it ✓ › ask-it ◆')
    await say($, '1번만 이슈로')
    expect(flat(await ui.drawn())).toContain('[ thegraph done ]  ')
    expect(flat(await ui.drawn())).toContain('ask-it ✓  done')
    await say($, '다음 거 하자')
    expect(flat(await ui.drawn())).toBe('BELOW')
  })

  test('a run its sheet checked off whole is moved on from at the next prompt', async ($, on) => {
    const fs = sheetFiles(on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('x') })
    expect(flat(await ui.drawn())).toContain('ask-it ✓  done')
    // No event saw ask-it end; the sheet did, and that is the end.
    await say($, '다음 거 하자')
    expect(flat(await ui.drawn())).toBe('BELOW')
  })

  test('a /thegraph whose skill never expands still replaces the run before it', async ($, on) => {
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph #1')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await say($, '/thegraph #2')
    await skill($, 'read-it')
    const line = flat(await ui.drawn())
    expect(line).toContain('[ thegraph #2 read-it ◐ <1m ]')
    expect(line).not.toContain('#1')
  })

  test('the GitHub issue on the sheet closed by the run ends the run; another issue closed does not', async ($, on) => {
    const fs = sheetFiles(on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false, isImage: false } }))
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph #42')
    await skill($, 'thegraph')
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~', 'kihyun1998/penterm#42') })
    await $.tool.call({ tool: 'Bash', command: 'gh issue close 41 --comment "dup"' })
    expect(flat(await ui.drawn())).toContain('make-it ◐')
    expect(flat(await ui.drawn())).not.toContain('done')
    await $.tool.call({ tool: 'Bash', command: 'gh issue close #42 -R kihyun1998/penterm --comment "done"' })
    expect(flat(await ui.drawn())).toContain('  done')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    expect(flat(await pane.drawn())).toContain('✓ issue closed')
    // Ended, it goes at the next prompt like any finished run.
    await say($, '다음')
    expect(flat(await ui.drawn())).toBe('BELOW')
  })

  test('the GitHub issue on the sheet closed elsewhere is found by asking gh now and then', async ($, on) => {
    const fs = sheetFiles(on)
    let state = 'OPEN'
    const asked: string[][] = []
    on('process.run', (_$, e) => {
      asked.push([...e.argv])
      const stdout = e.argv[0] === 'gh' ? `${state}\n` : '/tmp\n'
      return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    })
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    const clock = await start($, on)
    const ui = await band($)
    await say($, '/thegraph #42')
    await skill($, 'thegraph')
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~', 'kihyun1998/penterm#42') })
    await clock.advance(6 * MIN)
    expect(flat(await ui.drawn())).toContain('make-it ◐')
    expect(asked.some(a => a[0] === 'gh' && a.includes('42') && a.includes('kihyun1998/penterm'))).toBe(true)
    state = 'CLOSED'
    await clock.advance(6 * MIN)
    expect(flat(await ui.drawn())).toContain('  done')
  })

  test('a local issue file marked done, or moved away once seen, ends the run', async ($, on) => {
    const fs = sheetFiles(on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false, isImage: false } }))
    const ISSUE = 'D:\\github\\penterm\\.scratch\\settings\\issues\\03-row-height.md'
    const issueText = (status: string) => `# 03 — 설정 행 높이 통일\n\nStatus: ${status}\n`
    await start($, on)
    const ui = await band($)
    for (const finish of ['status', 'move'] as const) {
      fs.write(ISSUE, issueText('ready-for-agent'))
      await say($, '/thegraph')
      await skill($, 'thegraph')
      await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~', ISSUE) })
      await $.tool.call({ tool: 'Bash', command: 'true' })
      expect(flat(await ui.drawn())).toContain('make-it ◐')
      if (finish === 'status') fs.write(ISSUE, issueText('done'))
      else fs.remove(ISSUE)
      await $.tool.call({ tool: 'Bash', command: 'true' })
      expect(flat(await ui.drawn())).toContain('  done')
      await say($, '다음')
      expect(flat(await ui.drawn())).toBe('BELOW')
    }
  })

  test('a local issue file never seen is not taken as closed', async ($, on) => {
    const fs = sheetFiles(on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false, isImage: false } }))
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~', 'D:\\nowhere\\typo.md') })
    await $.tool.call({ tool: 'Bash', command: 'true' })
    expect(flat(await ui.drawn())).toContain('make-it ◐')
    expect(flat(await ui.drawn())).not.toContain('done')
  })

  test("the run is named by its sheet's issue once there is one, by the label until then", async ($, on) => {
    const fs = sheetFiles(on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph #42 band redraw')
    await skill($, 'thegraph')
    expect(flat(await ui.drawn())).toContain('[ thegraph #42 band redraw read-it ]')
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~', 'kihyun1998/penterm#42') })
    const line = flat(await ui.drawn())
    expect(line).toContain('[ thegraph #42 make-it ◐')
    expect(line).not.toContain('band redraw')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    const text = flat(await pane.drawn())
    expect(text).toContain('thegraph #42 설정 행 높이 통일 · prose')
    // Under the header, where the issue lives; its title is not said twice.
    expect(text).toContain('kihyun1998/penterm#42')
    expect(text).not.toContain('03-row-height.md — ')
  })

  test('a bare /thegraph gains a name from its sheet, a local issue named by its file', async ($, on) => {
    const fs = sheetFiles(on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    expect(flat(await ui.drawn())).toContain('[ thegraph read-it ]')
    const ISSUE = 'D:\\github\\penterm\\.scratch\\settings\\issues\\03-row-height.md'
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~', ISSUE) })
    expect(flat(await ui.drawn())).toContain('[ thegraph 03-row-height make-it ◐')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    expect(flat(await pane.drawn())).toContain(ISSUE)
  })

  test("a sheet issue with no title is named by its number; one with no source by its line, the chip by the line's issue", async ($, on) => {
    const fs = sheetFiles(on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    const issueLine = (issue: string, source?: string) =>
      sheetText('~', source).replace(/^issue: .*$/m, `issue: ${issue}`)
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: issueLine('#7', '#7') })
    expect(flat(await ui.drawn())).toContain('[ thegraph #7 make-it ◐')
    // An older sheet, before `source:`: the chip names the issue before its title, the pane the whole line.
    const old = '.scratch/settings/issues/03-row-height.md — 설정 행 높이 통일'
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: issueLine(old) })
    expect(flat(await ui.drawn())).toContain('[ thegraph 03-row-height make-it ◐')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    expect(flat(await pane.drawn())).toContain(`thegraph ${old} · prose`)
  })

  test('a long title stays off the chip, and is whole in the pane', async ($, on) => {
    const fs = sheetFiles(on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    const title = '세션 하나는 엔진 하나를 프레임 싱크 하나에 묶는다 — 피드, 펌프, 구독, 크기 조정, 종료까지'
    const name = `#1043 ${title}`
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~', 'o/r#1043').replace(/^issue: .*$/m, `issue: #1043 — ${title}`) })
    const line = flat(await ui.drawn())
    expect(line).toContain('[ thegraph #1043 make-it ◐')
    expect(line).not.toContain('세션')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    const drawn = await pane.drawn()
    expect(flat(drawn)).toContain(`thegraph ${name} · prose`)
    // Whole on screen too: the header wraps at the pane's width rather than cutting the name off.
    expect(wrapOf(drawn, `thegraph ${name}`)).toBe('wrap')
  })

  test("a sheet's issue line left as the template's placeholder names nothing", async ($, on) => {
    const fs = sheetFiles(on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph #5')
    await skill($, 'thegraph')
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~').replace(/^issue: .*$/m, "issue: <the issue as read-it resolved it> — <its title>") })
    expect(flat(await ui.drawn())).toContain('[ thegraph #5 make-it ◐')
    expect(flat(await ui.drawn())).not.toContain('<the issue')
  })

  test('a question put away with Esc is no answer: the run waits, and what is typed next takes it up again', async ($, on) => {
    let isEsc = true
    on('tool.call', { tool: 'AskUserQuestion' }, () =>
      isEsc ? { deny: 'The user dismissed the question.' } : { result: { questions: [], answers: { '이슈로 남길까요?': '1번만' } } })
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await endTurn($)
    await say($, 'ok')
    for (const s of ['make-it', 'check-it', 'ask-it']) await skill($, s)
    const ask = () => $.tool.call({ tool: 'AskUserQuestion', questions: [{ question: '이슈로 남길까요?', header: '정리', options: [], multiSelect: false }] })
    await ask()
    expect(flat(await ui.drawn())).toContain('check-it ✓ › ask-it ◆')
    expect(flat(await ui.drawn())).not.toContain('done')
    // What is typed after the Esc is not the answer to the question put away: ask-it goes on.
    await say($, '아 잘못 눌렀어, 다시 물어봐')
    expect(flat(await ui.drawn())).toContain('check-it ✓ › ask-it ◐')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    expect(flat(await pane.drawn())).toContain('◆ 이슈로 남길까요? → dismissed')
    // Asked again and answered, it ends.
    isEsc = false
    await ask()
    expect(flat(await ui.drawn())).toContain('ask-it ✓  done')
  })

  test('an answer typed after an Esc ends the run one prompt later, at the end of the turn it began', async ($, on) => {
    on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'The user dismissed the question.' }))
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await endTurn($)
    await say($, 'ok')
    for (const s of ['make-it', 'check-it', 'ask-it']) await skill($, s)
    await $.tool.call({ tool: 'AskUserQuestion', questions: [{ question: '이슈로 남길까요?', header: '정리', options: [], multiSelect: false }] })
    // The real answer, typed instead of picked: taken as the run going on, not yet its end.
    await say($, '1번만 이슈로')
    expect(flat(await ui.drawn())).toContain('ask-it ◐')
    // ask-it files it and its turn ends; the move is the person's, and whatever they say next ends it.
    await endTurn($)
    expect(flat(await ui.drawn())).toContain('ask-it ◆')
    await say($, '고마워')
    expect(flat(await ui.drawn())).toContain('ask-it ✓  done')
  })

  test('a second /thegraph starts clean, whatever the first left: open, waiting, a box put away', async ($, on) => {
    on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'The user dismissed the question.' }))
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph #1')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await endTurn($)
    await say($, 'ok')
    for (const s of ['make-it', 'firsthand', 'check-it', 'ask-it']) await skill($, s)
    await $.tool.call({ tool: 'AskUserQuestion', questions: [{ question: '이슈로?', header: '정리', options: [], multiSelect: false }] })
    expect(flat(await ui.drawn())).toContain('thegraph #1')
    // The next run's prompt replaces the first whole, before its skill expands.
    await say($, '/thegraph #2')
    expect(flat(await ui.drawn())).toContain('thegraph #2')
    expect(flat(await ui.drawn())).not.toContain('thegraph #1')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    const line = flat(await ui.drawn())
    expect(line).toContain('[ thegraph #2 read-it ◐ <1m ]  read-it ◐ › confirm › make-it › check-it › ask-it')
    expect(lastRun($)?.signals).toEqual([])
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    expect(flat(await pane.drawn())).not.toContain('이슈로?')
    // And the second runs to its end as any run does.
    await endTurn($)
    await say($, '진행')
    await skill($, 'ask-it')
    await endTurn($)
    await say($, '끝')
    expect(flat(await ui.drawn())).toContain('thegraph #2')
    expect(flat(await ui.drawn())).toContain('ask-it ✓  done')
  })

  test('a slash command moves on from a finished run too', async ($, on) => {
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await endTurn($)
    await say($, 'ok')
    await skill($, 'ask-it')
    await endTurn($)
    await say($, '그거만')
    expect(flat(await ui.drawn())).toContain('done')
    await say($, '/context')
    expect(flat(await ui.drawn())).toBe('BELOW')
  })

  test('a code run keeps its steps through the lens check-it runs, and the pane says prose/code', async ($, on) => {
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await endTurn($)
    await say($, '진행')
    for (const s of ['make-it', 'check-it', 'lens', 'firsthand']) await skill($, s)
    const text = flat(await ui.drawn())
    expect(text).toContain('check-it ◐ › ask-it')
    expect(lastRun($)?.signals.length).toBe(1)
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    expect(flat(await pane.drawn())).toContain('thegraph · prose/code')
  })

  test('`clear run ×` in the pane gives the run up: the chip goes and the pane closes', async ($, on) => {
    const host = paneHost(on)
    await start($, on)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await endTurn($)
    await say($, '진행')
    await skill($, 'make-it')
    host.panes.add('thegraph')
    const pane = await $.ui.mount({
      plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS,
      viewport: { columns: 145, rows: 40, isFullscreen: false },
    })
    // On the main screen its hotkey follows it, as on path-band's line.
    expect(flat(await pane.drawn())).toContain('[ clear run × ]x')
    await pane.press({ key: 'clear' })
    expect(flat(await (await band($)).drawn())).toBe('BELOW')
    expect(lastChip($)).toBe(null)
    expect([...host.panes]).toEqual([])
    // The skills that come after it start nothing; only a new /thegraph does.
    await skill($, 'check-it')
    expect(flat(await (await band($)).drawn())).toBe('BELOW')
  })
})

describe('run', () => {
  test('labelOf takes what follows /thegraph, and nothing else', () => {
    expect(labelOf('/thegraph #42 x')).toBe('#42 x')
    expect(labelOf('/thegraph')).toBe('')
    expect(labelOf('/thegraph-codex #1')).toBe(null)
    expect(labelOf('run /thegraph')).toBe(null)
  })

  test('lens makes the route an open decision, ending at the decide stop', () => {
    let r = onSkill(startRun(null, 0), 'read-it', 0)
    r = onTurnEnd(r, 1)
    r = onAnswer(r, 2)!
    r = onSkill(r, 'lens', 3)
    expect(r.route).toBe('decision')
    r = onTurnEnd(r, 4)
    expect(stateOf(r, DECIDE)).toBe('wait')
    r = onAnswer(r, 5)!
    expect(r.doneAt).toBe(5)
  })

  test('a turn that ends after the confirm with no step waits; it is not taken for a trivial end', () => {
    let r = onSkill(startRun(null, 0), 'read-it', 0)
    r = onTurnEnd(r, 1)
    r = onAnswer(r, 2)!
    expect(stateOf(r, CONFIRM)).toBe('done')
    // A question about naming before make-it, say.
    r = onTurnEnd(r, 3)
    expect(r.doneAt).toBe(null)
    expect(r.isWaiting).toBe(true)
    r = onSkill(onAnswer(r, 4)!, 'make-it', 5)
    expect(stateOf(r, 'make-it')).toBe('run')
  })

  test('the lens check-it runs is not the open-decision step', () => {
    let r = onSkill(startRun(null, 0), 'read-it', 0)
    r = onAnswer(onTurnEnd(r, 1), 2)!
    for (const s of ['make-it', 'check-it', 'lens']) r = onSkill(r, s, 3)
    expect(r.route).toBe('build')
    expect(stateOf(r, 'check-it')).toBe('run')
    expect(r.steps.some(s => s.key === 'lens')).toBe(false)
  })

  test('check-it sending work back to make-it leaves check-it to do again', () => {
    let r = onSkill(startRun(null, 0), 'read-it', 0)
    r = onAnswer(onTurnEnd(r, 1), 2)!
    r = onSkill(onSkill(onSkill(r, 'make-it', 3), 'check-it', 4), 'make-it', 5)
    expect(stateOf(r, 'make-it')).toBe('run')
    expect(stateOf(r, 'check-it')).toBe('todo')
    r = onSkill(r, 'check-it', 6)
    expect(stateOf(r, 'make-it')).toBe('done')
    expect(stateOf(r, 'check-it')).toBe('run')
  })

  test('a question mid-step waits on that step, and the answer resumes it', () => {
    let r = onSkill(onTurnEnd(onSkill(startRun(null, 0), 'read-it', 0), 1), 'make-it', 2)
    r = onAnswer(r, 2)!
    r = onTurnEnd(r, 3)
    expect(stateOf(r, 'make-it')).toBe('wait')
    r = onAnswer(r, 4)!
    expect(stateOf(r, 'make-it')).toBe('run')
    expect(r.doneAt).toBe(null)
  })

  test('an edit opens make-it only right after the confirm, never during read-it, on the decision route, or later', () => {
    let r = onSkill(startRun(null, 0), 'read-it', 0)
    expect(onEdit(r, 1)).toBe(r)
    r = onAnswer(onTurnEnd(r, 1), 2)!
    expect(stateOf(onEdit(r, 3), 'make-it')).toBe('run')
    const decision = onSkill(r, 'lens', 3)
    expect(onEdit(onAnswer(onTurnEnd(decision, 4), 5)!, 6).steps.some(s => s.key === 'make-it')).toBe(false)
    const checking = onSkill(onSkill(r, 'make-it', 3), 'check-it', 4)
    expect(onEdit(checking, 5)).toBe(checking)
  })

  test('a run sheet parses into steps, their notes, the route and what is carried', () => {
    const sheet = parseSheet(SHEET, sheetText('~'))
    expect(sheet.steps.map(s => `${s.key}:${s.mark}`)).toEqual(['read-it:done', `${CONFIRM}:done`, 'make-it:doing', 'check-it:todo', 'ask-it:todo'])
    expect(sheet.steps[2]?.note).toBe('check-it: 문서만 바뀜, prose 검사만')
    expect(sheet.route).toBe('prose')
    expect(sheet.carried).toEqual(['단축키 표 문구가 SPEC과 다름'])
    // The template's placeholder is no route yet; CRLF reads the same.
    expect(parseSheet(SHEET, "route: <read-it's label>\r\n- [x] decide\r\n").route).toBe(null)
    expect(parseSheet(SHEET, "route: <read-it's label>\r\n- [x] decide\r\n").steps[0]?.key).toBe(DECIDE)
  })

  test('only a file named like a run sheet is one: not thegraph/SKILL.md, not a dated note elsewhere', () => {
    expect(isSheetPath(SHEET)).toBe(true)
    expect(isSheetPath('/tmp/thegraph/skills-20261007-0900-0123abcd.md')).toBe(true)
    expect(isSheetPath('D:\\github\\skills\\thegraph\\SKILL.md')).toBe(false)
    expect(isSheetPath('/tmp/notes/penterm-20261007-1542-7f3a9c2e.md')).toBe(false)
  })

  test('the person holding the move shows on the sheet step under way', () => {
    const run = { ...onSkill(startRun(null, 0), 'read-it', 0), sheet: parseSheet(SHEET, sheetText('~')), isWaiting: true }
    expect(stepsOf(run).map(s => s.state)).toEqual(['done', 'done', 'wait', 'todo', 'todo'])
  })

  test('a test runner is told from other commands, and its counts read from what it printed', () => {
    expect(testOf('npx vitest run src')).toBe('vitest')
    expect(testOf('cd x && cargo test -p a')).toBe('cargo test')
    expect(testOf('claude plugin test thegraph-panel')).toBe('claude plugin test')
    expect(testOf('git status')).toBe(null)
    expect(testCounts(' 21 pass\n 0 fail')).toBe('21 pass')
    expect(testCounts('test result: FAILED. 3 passed; 1 failed')).toBe('3 pass · 1 fail')
    expect(testCounts('done')).toBe(null)
  })

  test('the log keeps a step once, however many sources say it began', () => {
    let r = onSkill(startRun(null, 0), 'read-it', 0)
    r = addLog(r, { at: 1, kind: 'step', text: 'read-it', detail: null })
    expect(r.log.filter(l => l.kind === 'step').map(l => l.text)).toEqual(['read-it'])
  })

  test('a newer reading of the sheet logs only what it added', () => {
    const first = parseSheet(SHEET, sheetText('~'))
    const lines = sheetLog(null, first, 5)
    expect(lines.map(l => l.kind)).toEqual(['note', 'step', 'note', 'carry'])
    const again = sheetLog(first, parseSheet(SHEET, sheetText('x')), 9)
    expect(again.map(l => `${l.kind}:${l.text}`)).toEqual(['end:done'])
  })

  test('the gantt: a row per step, a cell wherever it ran, a step run twice in two stretches', () => {
    const MIN = 60_000
    let r = startRun(null, 0)
    r = onSkill(r, 'read-it', 0)
    r = onTurnEnd(r, 2 * MIN)
    r = onAnswer(r, 3 * MIN) ?? r
    r = onSkill(r, 'make-it', 3 * MIN)
    r = onSkill(r, 'check-it', 6 * MIN)
    r = onSkill(r, 'make-it', 8 * MIN)
    const rows = gantt(r, 10 * MIN, 10)
    const bar = (key: string) => rows.find(x => x.key === key)?.cells.map(c => (c ? '█' : '·')).join('')
    expect(bar('read-it')).toBe('██········')
    expect(bar('confirm')).toBe('··█·······')
    expect(bar('make-it')).toBe('···███··██')
    expect(bar('check-it')).toBe('······██··')
    expect(bar('ask-it')).toBe('··········')
    expect(rows.find(x => x.key === 'make-it')?.ms).toBe(5 * MIN)
    expect(rows.find(x => x.key === 'ask-it')?.ms).toBe(null)
    // Forty minutes in ten cells: the one-minute confirm still fills the cell it fell in.
    const scaled = gantt(r, 40 * MIN, 10)
    expect(scaled.find(x => x.key === 'confirm')?.cells.map(c => (c ? '█' : '·')).join('')).toBe('█·········')
    // A moment of the run names its step, and the second time round says so.
    expect(stepAt(r, 1 * MIN)).toBe('read-it')
    expect(stepAt(r, 4 * MIN)).toBe('make-it')
    expect(stepAt(r, 9 * MIN)).toBe('make-it #2')
  })

  test('the chip: the step at hand with its mark and the time in it over every round, a waiting step, done', () => {
    const MIN = 60_000
    let r = startRun('#9 x', 0)
    expect(chipOf(r, [], 0)).toEqual({ head: 'thegraph', issue: '#9 x', step: 'read-it', time: null, children: [], conductor: null })
    r = onSkill(r, 'read-it', 0)
    r = onTurnEnd(r, 2 * MIN)
    expect(chipOf(r, [], 2 * MIN)?.step).toBe('confirm ◆')
    r = onAnswer(r, 3 * MIN) ?? r
    r = onSkill(r, 'make-it', 3 * MIN)
    r = onSkill(r, 'check-it', 6 * MIN)
    r = onSkill(r, 'make-it', 8 * MIN)
    // make-it ran 3 minutes, then 2 so far.
    expect(chipOf(r, [], 10 * MIN)).toMatchObject({ step: 'make-it ◐', time: '5m' })
    // A sheet that puts make-it back to do: no mark, and no time, though it ran before.
    expect(chipOf({ ...r, sheet: parseSheet(SHEET, sheetText(' ')) }, [], 10 * MIN)).toMatchObject({ step: 'make-it', time: null })
    expect(chipOf({ ...r, doneAt: 11 * MIN }, [], 12 * MIN)).toMatchObject({ step: 'done', time: null })
    expect(chipOf(null, [], 0)).toBe(null)
  })

  test("a turn's summary counts only what the turn did", () => {
    const log = [
      { at: 1, kind: 'edit' as const, text: 'old.ts', detail: null },
      { at: 10, kind: 'edit' as const, text: 'a.ts', detail: null },
      { at: 11, kind: 'test' as const, text: 'vitest', detail: '48 pass', isOk: true },
      { at: 12, kind: 'ask' as const, text: 'q?', detail: 'yes' },
    ]
    expect(turnSummary(log, 5, 'make-it').map(s => s.text).join('')).toBe(' · thegraph make-it  ✎1  ✓ 48 pass  ◆1')
  })

  test('signals count in the order they first fired, and a skill that is no signal adds none', () => {
    let r = startRun(null, 0)
    for (const s of ['firsthand', 'unrelated', 'firsthand']) r = onSkill(r, s, 0)
    expect(signalSummary(r)).toBe('firsthand×2')
    const at = 0
    expect(signalSummary({ ...r, signals: [{ skill: 'b', at }, { skill: 'a', at }, { skill: 'b', at }] })).toBe('b×2 a')
  })
})

// --- /thegraph-herdr: the conductor and its workers ----------------------------------------

const OK = { exitCode: 0, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }

// The herdr run's sheet, as the conductor writes it, with its children.
const herdSheet = (children: string[] | null) => [
  '# thegraph-herdr run sheet',
  'issue: #50 — herdr follow-up',
  'source: kihyun1998/skills#50',
  'repo: /w',
  'route: code',
  'conductor: opus medium',
  '',
  '- [x] read-it',
  '- [x] confirm',
  '- [~] workers',
  '- [ ] ask-it',
  ...(children === null ? [] : ['', '## Children', ...children]),
  '',
  '## Carried',
  '- one thing',
].join('\n')

// hc and herdr-app as the session finds them: `ls` answers what `terminals` holds; every argv is recorded.
const herdr = ($: Engine, on: On, opts: { terminals?: unknown[]; self?: unknown; env?: Record<string, string> } = {}) => {
  const h = { terminals: opts.terminals ?? [], argv: [] as string[][], isBroken: false }
  // Inside Herdr unless a test says otherwise: hc answers for terminal t1, which is no worker.
  on('env.get', (_$, e) => ({ value: (opts.env ?? { HC_TERMINAL_ID: 't1' })[e.name] }))
  on('process.run', (_$, e) => {
    const argv = [...e.argv]
    h.argv.push(argv)
    if (h.isBroken && (argv[0] === 'hc' || argv[0] === 'herdr-app')) throw new Error('spawn hc ENOENT')
    if (argv[0] === 'hc' && argv[1] === 'ls') return { value: { ...OK, stdout: JSON.stringify({ hidden_finished: 0, terminals: h.terminals }) } }
    if (argv[0] === 'hc' && argv[1] === 'get') return { value: { ...OK, stdout: JSON.stringify(opts.self ?? {}) } }
    if (argv[0] === 'herdr-app') return { value: { ...OK, stdout: '{"ok": true}' } }
    return { value: { ...OK, stdout: '/tmp\n' } }
  })
  return h
}

const term = (address: string, name: string, status: string) => ({ address, name, parent: 't1', state: 'live', status, agent: 'claude-code' })

// The issue the chip names, as the panel last wrote it; null with no chip.
const issueChip = async ($: Engine) => lastChip($)?.issue ?? null

// A conductor run under way: /thegraph-herdr typed, its skill expanded, its sheet written by the shell.
const conduct = async ($: Engine, on: On, fs: ReturnType<typeof sheetFiles>, children: string[] | null) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false, isImage: false } }))
  const clock = await start($, on)
  await say($, '/thegraph-herdr #50')
  const told = (await $.skill.prompt({ skill: 'thegraph-herdr', text: 'BODY' })).text
  const path = /This run's run sheet: (\S+)/.exec(told)?.[1] ?? ''
  fs.write(path, herdSheet(children))
  await $.tool.call({ tool: 'Bash', command: 'true' })
  return { clock, path }
}

describe('thegraph-herdr', () => {
  test('a typed /thegraph-herdr starts a conductor run named as such, on its own steps, and its skill is told the sheet', async ($, on) => {
    herdr($, on)
    on('tool.call', { tool: 'Write' }, (_$, e) => ({ result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }))
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph-herdr #50')
    const told = (await $.skill.prompt({ skill: 'thegraph-herdr', text: 'BODY' })).text
    const path = /This run's run sheet: (\S+)/.exec(told)?.[1] ?? ''
    expect(told.startsWith('BODY')).toBe(true)
    expect(isSheetPath(path)).toBe(true)
    await skill($, 'read-it')
    const line = flat(await ui.drawn())
    expect(line).toContain('[ herdr #50 read-it ◐ <1m ]  read-it ◐ › confirm › workers › ask-it')
    expect(line).not.toContain('make-it')
    await endTurn($)
    expect(flat(await ui.drawn())).toContain('read-it ✓ › confirm ◆ › workers › ask-it')
    // Writing a brief after the confirm is the conductor's work, not make-it begun.
    await say($, '진행')
    await $.tool.call({ tool: 'Write', file_path: '/tmp/thegraph/w-20261116-0925-e5cec753.50.brief.md', content: 'x' })
    expect(flat(await ui.drawn())).not.toContain('make-it')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    const log = flat(await pane.drawn())
    expect(log).toContain('▸ read-it')
    expect(log).not.toContain('make-it')
  })

  test('/thegraph-codex is still not followed', async ($, on) => {
    herdr($, on)
    await start($, on)
    const ui = await band($)
    await say($, '/thegraph-codex #50')
    await skill($, 'thegraph-codex')
    await skill($, 'read-it')
    expect(flat(await ui.drawn())).toBe('BELOW')
  })

  test("the conductor's chip carries every child with its state, a live worker's with its terminal to focus", async ($, on) => {
    const fs = sheetFiles(on)
    const h = herdr($, on)
    const { path } = await conduct($, on, fs, ['- #37 — opus medium, done, 703ccfd', '- #38 — opus high, under way', '- #39 — sonnet medium, waiting'])
    const id = /([0-9a-f]{8})\.md$/.exec(path)?.[1] ?? ''
    // Another run's terminal for the same issue, listed first, and this run's worker.
    h.terminals = [term('t9', 'tg-0badc0de-38', 'idle'), term('t30', `tg-${id}-38`, 'working')]
    await $.tool.call({ tool: 'Bash', command: 'hc run' })
    const ui = await band($)
    const text = flat(await ui.drawn())
    expect(text).toContain('[ herdr #38 workers ◐ ] #37 done [ #38 working ] #39 waiting  read-it ✓ › confirm ✓ › workers ◐ › ask-it')
    // Only this run's worker: the other run's terminal for #38 is no press.
    expect(pressOf(`${WORKER_KEY}t30`, lastChip($))).toEqual({ kind: 'focus', address: 't30' })
    expect(pressOf(`${WORKER_KEY}t9`, lastChip($))).toBe(null)
    // The chip names the child being worked on.
    expect(await issueChip($)).toBe('#38')
  })

  test('the list follows hc after tool calls and on the timer; with no live worker the chip names the anchor', async ($, on) => {
    const fs = sheetFiles(on)
    const h = herdr($, on)
    const { clock, path } = await conduct($, on, fs, ['- #37 — done', '- #38 — under way'])
    const id = /([0-9a-f]{8})\.md$/.exec(path)?.[1] ?? ''
    h.terminals = [term('t30', `tg-${id}-38`, 'working')]
    await $.tool.call({ tool: 'Bash', command: 'hc run' })
    const ui = await band($)
    expect(flat(await ui.drawn())).toContain('[ #38 working ]')
    h.terminals = [term('t30', `tg-${id}-38`, 'blocked')]
    await clock.advance(30_000)
    expect(flat(await ui.drawn())).toContain('[ #38 blocked ]')
    expect(await issueChip($)).toBe('#38')
    // Done but not yet removed: still a button, and no longer the issue being worked on.
    h.terminals = [term('t30', `tg-${id}-38`, 'done')]
    await clock.advance(30_000)
    expect(flat(await ui.drawn())).toContain('[ #38 done ]')
    expect(await issueChip($)).toBe('#50')
    // Killed and removed: gone from hc, so no button, and the sheet's line says where it stands.
    h.terminals = []
    await $.tool.call({ tool: 'Bash', command: 'hc rm t30' })
    const text = flat(await ui.drawn())
    expect(text).toContain('#38 waiting')
    expect(text).not.toContain('[ #38')
    expect(await issueChip($)).toBe('#50')
  })

  test('a single issue with no children shows the one worker found under its run id', async ($, on) => {
    const fs = sheetFiles(on)
    const h = herdr($, on)
    const { path } = await conduct($, on, fs, null)
    const id = /([0-9a-f]{8})\.md$/.exec(path)?.[1] ?? ''
    h.terminals = [term('t31', `tg-${id}-50`, 'idle'), term('t1', 'other', 'working')]
    await $.tool.call({ tool: 'Bash', command: 'hc run' })
    const ui = await band($)
    // Idle, a question waiting on the person, is still at work.
    expect(flat(await ui.drawn())).toContain('[ #50 working ]')
    expect(await issueChip($)).toBe('#50')
  })

  test('a failed hc leaves the chip as it was', async ($, on) => {
    const fs = sheetFiles(on)
    const h = herdr($, on)
    const { clock, path } = await conduct($, on, fs, ['- #38 — under way'])
    const id = /([0-9a-f]{8})\.md$/.exec(path)?.[1] ?? ''
    h.terminals = [term('t30', `tg-${id}-38`, 'working')]
    await $.tool.call({ tool: 'Bash', command: 'hc run' })
    const ui = await band($)
    h.isBroken = true
    await clock.advance(30_000)
    expect(flat(await ui.drawn())).toContain('[ #38 working ]')
  })

  test('with no hc a herdr run shows its chip and its children, none with a terminal', async ($, on) => {
    const fs = sheetFiles(on)
    const h = herdr($, on)
    h.isBroken = true
    await conduct($, on, fs, ['- #38 — under way'])
    const text = flat(await (await band($)).drawn())
    expect(text).toContain('workers ◐')
    expect(text).toContain('#38 waiting')
  })

  test('the chip names a plain /thegraph run by its issue, a local issue by its file name, says done at its end, and goes after', async ($, on) => {
    const fs = sheetFiles(on)
    herdr($, on)
    on('tool.call', { tool: 'Write' }, (_$, e) => {
      fs.write(e.file_path, e.content)
      return { result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null } }
    })
    await start($, on)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    // Never written yet is no chip too.
    expect((await issueChip($)) ?? null).toBe(null)
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~', 'D:\\github\\penterm\\.scratch\\settings\\issues\\03-row-height.md') })
    expect(await issueChip($)).toBe('03-row-height')
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('~', 'kihyun1998/penterm#42') })
    expect(await issueChip($)).toBe('#42')
    await $.tool.call({ tool: 'Write', file_path: SHEET, content: sheetText('x', 'kihyun1998/penterm#42') })
    expect(lastChip($)).toMatchObject({ issue: '#42', step: 'done', time: null })
    await say($, '다음')
    expect(lastChip($)).toBe(null)
  })
})

describe('a herdr worker', () => {
  const BRIEF = 'C:\\Temp\\thegraph\\skills-20261116-0925-e5cec753.52.brief.md'
  const briefText = [
    'You are the worker for one issue of a /thegraph-herdr run.',
    '',
    'Conductor terminal: t2x',
    'Repo: D:\\github\\skills',
    'Issue: kihyun1998/skills#52 — panel follows herdr',
    'Route: code',
  ].join('\n')
  const SELF = { address: 't33', name: 'tg-e5cec753-52', parent: 't2x', state: 'live', status: { app: 'claude-code', msg: '', state: 'working' } }

  const asWorker = async ($: Engine, on: On, opts: { isListed?: boolean } = {}) => {
    const fs = sheetFiles(on)
    fs.write(BRIEF, briefText)
    const listed = opts.isListed === false ? [] : [{ name: 'skills-20261116-0925-e5cec753.52.brief.md', kind: 'file' as const, size: 1, mtimeMs: 1, isLink: false }]
    on('fs.list', () => ({ value: listed }))
    on('tool.call', { tool: 'Read' }, () => ({ result: { type: 'text', file: { filePath: BRIEF, content: briefText, numLines: 6, startLine: 1, totalLines: 6 } } }))
    on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false, isImage: false } }))
    on('classic.SessionStart', () => ({}))
    const h = herdr($, on, { self: SELF, env: { HC_TERMINAL_ID: 't33' } })
    const clock = await start($, on)
    return { h, fs, clock }
  }

  test('is told from its terminal name with no prompt, names its issue from the brief, and walks make-it and check-it', async ($, on) => {
    const { clock } = await asWorker($, on)
    const ui = await band($)
    expect(flat(await ui.drawn())).toContain('[ worker #52 make-it ] [ ↩ t2x ]  make-it › check-it')
    expect(await issueChip($)).toBe('#52')
    await say($, `Read ${BRIEF} and do what it says.`)
    await skill($, 'make-it')
    await clock.advance(3 * MIN)
    expect(flat(await ui.drawn())).toContain('[ worker #52 make-it ◐ 3m ]')
    await skill($, 'check-it')
    await skill($, 'make-it')
    expect(flat(await ui.drawn())).toContain('make-it×2 ◐ › check-it')
  })

  test('takes its issue from the read of its brief when no listing found it', async ($, on) => {
    await asWorker($, on, { isListed: false })
    const ui = await band($)
    expect(flat(await ui.drawn())).toContain('[ worker make-it ] [ ↩ t2x ]  make-it › check-it')
    await $.tool.call({ tool: 'Read', file_path: BRIEF })
    expect(flat(await ui.drawn())).toContain('[ worker #52 make-it ]')
  })

  test("its way back names the conductor's terminal, its hc parent", async ($, on) => {
    await asWorker($, on)
    expect(lastChip($)?.conductor).toBe('t2x')
    expect(pressOf(CONDUCTOR_KEY, lastChip($))).toEqual({ kind: 'focus', address: 't2x' })
  })

  test('its done report ends it at the end of that turn, unless a skill follows; more work takes it up again', async ($, on) => {
    const { clock } = await asWorker($, on)
    const ui = await band($)
    await skill($, 'make-it')
    await clock.advance(MIN)
    await skill($, 'check-it')
    await clock.advance(MIN)
    // A question sent up waits on the answer; it is no end.
    await $.tool.call({ tool: 'Bash', command: 'hc send t2x "question C:\\Temp\\x.report.md"' })
    await endTurn($)
    expect(flat(await ui.drawn())).not.toContain('  done')
    await say($, 'answer')
    await $.tool.call({ tool: 'Bash', command: 'hc send t2x "done C:\\Temp\\x.report.md"' })
    await skill($, 'make-it')
    await endTurn($)
    expect(flat(await ui.drawn())).not.toContain('  done')
    await say($, 'go on')
    await $.tool.call({ tool: 'Bash', command: 'hc send t2x "done C:\\Temp\\x.report.md"' })
    await endTurn($)
    expect(flat(await ui.drawn())).toContain('[ worker #52 done ]')
    expect(flat(await ui.drawn())).toContain('  done')
    // The conductor sends back what differs: the worker is at it again.
    await say($, 'the commit touches files left alone')
    expect(flat(await ui.drawn())).toContain('[ worker #52 ')
    expect(flat(await ui.drawn())).not.toContain('  done')
  })

  test('a session whose terminal is no worker has no chip, and hc failing breaks nothing', async ($, on) => {
    sheetFiles(on)
    herdr($, on, { self: { address: 't2x', state: 'live' }, env: { HC_TERMINAL_ID: 't2x' } })
    await start($, on)
    expect(flat(await (await band($)).drawn())).toBe('BELOW')
  })

  test('outside Herdr hc is never asked', async ($, on) => {
    sheetFiles(on)
    const h = herdr($, on, { env: {} })
    await start($, on)
    expect(flat(await (await band($)).drawn())).toBe('BELOW')
    expect(h.argv.some(a => a[0] === 'hc')).toBe(false)
  })

  test('after /clear the worker is told again', async ($, on) => {
    await asWorker($, on)
    // As /clear leaves it: the run gone from the state.
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    await pane.press({ key: 'clear' })
    expect(flat(await (await band($)).drawn())).toBe('BELOW')
    await $.classic.SessionStart({ source: 'clear' })
    expect(flat(await (await band($)).drawn())).toContain('[ worker #52 make-it ]')
  })
})
