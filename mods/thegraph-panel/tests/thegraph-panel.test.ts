import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { CONFIRM, DECIDE, labelOf, onAnswer, onSkill, onTurnEnd, signalSummary, startRun, stateOf } from '../hooks/run'

const MIN = 60_000

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 140,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

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
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('skill.prompt', (_$, e) => ({ text: e.text }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  // Another plugin's band beneath this one, as usage-band would draw.
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', props: {}, children: ['BELOW'] }))
  await $.session.start({ cwd: '/w', surface: 'terminal', isInteractive: true })
  await clock.settle()
  return clock
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

const band = ($: Engine) => $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'AbovePrompt', props: BAND })

describe('thegraph-panel', () => {
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
    expect(flat(await ui.drawn())).toContain('thegraph #42 band redraw   ◉ read-it › 확인 › make-it')

    await clock.advance(3 * MIN)
    await endTurn($)
    expect(flat(await ui.drawn())).toContain('✓ read-it › ◆ 확인 대기 › make-it')

    // A slash command while it waits is not the answer.
    await say($, '/context')
    expect(flat(await ui.drawn())).toContain('◆ 확인 대기')
    await say($, '맞아, 진행해')
    await skill($, 'make-it')
    await skill($, 'redden')
    await skill($, 'redden')
    const text = flat(await ui.drawn())
    expect(text).toContain('✓ read-it › ✓ 확인 › ◉ make-it › check-it › ask-it')
    expect(text).toContain('⚑ redden×2')
    // Its line sits over the band beneath, which still draws.
    expect(text.endsWith('BELOW')).toBe(true)
  })

  test('the band carries a button that opens and closes the checklist pane', async ($, on) => {
    // The surface's panes, as the engine keeps them.
    const panes = new Set<string>()
    on('ui.open', (_$, e) => {
      panes.add(e.id)
      return { value: { isPlaced: true as const } }
    })
    on('ui.close', (_$, e) => {
      panes.delete(e.id)
      return { value: undefined }
    })
    await start($, on)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    const ui = await band($)
    expect(flat(await ui.drawn())).toContain('▸ 패널')

    await ui.press({ key: 'pane' })
    expect([...panes]).toEqual(['thegraph'])
    expect(flat(await ui.drawn())).toContain('▾ 패널 닫기')

    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    expect(flat(await pane.drawn())).toContain('[◉] read-it')

    await ui.press({ key: 'pane' })
    expect([...panes]).toEqual([])
    expect(flat(await ui.drawn())).toContain('▸ 패널')
  })

  test('a finished run stays until the next prompt, then the line goes', async ($, on) => {
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
    expect(flat(await ui.drawn())).toContain('◆ ask-it 대기')
    await say($, '1번만 이슈로')
    expect(flat(await ui.drawn())).toContain('끝')
    await say($, '다음 거 하자')
    expect(flat(await ui.drawn())).toBe('BELOW')
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
    expect(flat(await ui.drawn())).toContain('끝')
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
    for (const s of ['make-it', 'check-it', 'lens', 'boundary']) await skill($, s)
    const text = flat(await ui.drawn())
    expect(text).toContain('✓ make-it › ◉ check-it › ask-it')
    expect(text).toContain('⚑ boundary')
    const pane = await $.ui.mount({ plugin: 'thegraph-panel', surface: 'terminal', component: 'Pane', requestId: 'thegraph', props: PANE_PROPS })
    expect(flat(await pane.drawn())).toContain('route  prose/code')
  })

  test('× gives a run up: the line goes and its pane closes', async ($, on) => {
    const panes = new Set<string>()
    on('ui.open', (_$, e) => {
      panes.add(e.id)
      return { value: { isPlaced: true as const } }
    })
    on('ui.close', (_$, e) => {
      panes.delete(e.id)
      return { value: undefined }
    })
    await start($, on)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    await skill($, 'read-it')
    await endTurn($)
    await say($, '진행')
    await skill($, 'make-it')
    const ui = await band($)
    await ui.press({ key: 'pane' })
    expect([...panes]).toEqual(['thegraph'])

    await ui.press({ key: 'dismiss' })
    expect(flat(await ui.drawn())).toBe('BELOW')
    expect([...panes]).toEqual([])
    // The skills that come after it start nothing; only a new /thegraph does.
    await skill($, 'check-it')
    expect(flat(await ui.drawn())).toBe('BELOW')
  })

  test('on the main screen, which reports no clicks, the button says which keys press it', async ($, on) => {
    await start($, on)
    await say($, '/thegraph')
    await skill($, 'thegraph')
    const at = (isFullscreen: boolean) =>
      $.ui.mount({
        plugin: 'thegraph-panel',
        surface: 'terminal',
        component: 'AbovePrompt',
        props: BAND,
        viewport: { columns: 145, rows: 40, isFullscreen },
      })
    expect(flat(await (await at(false)).drawn())).toContain('[ ▸ 패널 ] [ × ] ctrl+x tab → g 패널 · x 치우기')
    expect(flat(await (await at(true)).drawn())).not.toContain('ctrl+x tab')
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

  test('signals count in the order they first fired', () => {
    let r = startRun(null, 0)
    for (const s of ['firsthand', 'redden', 'firsthand', 'unrelated']) r = onSkill(r, s, 0)
    expect(signalSummary(r)).toBe('firsthand×2 redden')
  })
})
