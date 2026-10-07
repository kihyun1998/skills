import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, SessionUsage } from 'claude-code'

import {
  effortFromSettings,
  fiveHourRate,
  modelLabel,
  parseBurn,
  parseToday,
  pieFigure,
  rateLevel,
  recordFive,
  resetIn,
  runwayColor,
  sinceArg,
} from '../hooks/format'

const MIN = 60_000
const HOUR = 60 * MIN

// The 5-hour window resets 2h13m after the mocked clock's 0, so 2h47m of it have passed.
const RESETS_AT = new Date(2 * HOUR + 13 * MIN).toISOString()

const usage = (ctx: number, five: number, seven: number, usd = 1.42): SessionUsage => ({
  startedAt: 0,
  context: { tokens: ctx * 2000, window: 200_000, percent: ctx },
  rateLimits: [
    { kind: 'five_hour', percentUsed: five, resetsAt: RESETS_AT },
    { kind: 'seven_day', percentUsed: seven },
  ],
  cost: { usd },
})

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 140,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

const blocksJson = (costPerHour: number) =>
  JSON.stringify({ blocks: [{ isActive: true, burnRate: { costPerHour } }] })
const dailyJson = (totalCost: number) =>
  JSON.stringify({ daily: [{ period: '2026-10-06', totalCost: 12 }, { period: '2026-10-07', totalCost }] })

type World = {
  burn: number
  today: number
  argv: string[][]
  usageReads?: number
  settings?: Record<string, unknown>
}

const start = async ($: Engine, on: On, u: SessionUsage, w: World) => {
  const clock = mock.clock(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => {
    w.usageReads = (w.usageReads ?? 0) + 1
    return { value: u }
  })
  on('settings.read', () => ({ value: w.settings ?? {} }))
  on('classic.SessionStart', () => ({}))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.step', async function* (_$, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: null }
  })
  on('process.run', (_$, e) => {
    w.argv.push([...e.argv])
    const stdout = e.argv.includes('blocks') ? blocksJson(w.burn) : dailyJson(w.today)
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  await $.session.start({ cwd: '/w', surface: 'terminal', isInteractive: true })
  await clock.settle()
  return clock
}

const measure = ($: Engine, u: SessionUsage) => $.session.measure({ ...u, changed: ['context', 'rateLimits'] })

// A drawn tree's text, its string children joined in order.
const flat = (node: unknown): string =>
  typeof node === 'string'
    ? node
    : node !== null && typeof node === 'object' && 'children' in node && Array.isArray(node.children)
      ? node.children.map(flat).join('')
      : ''

// The band's rows: the outer Box's children, each flattened.
const rows = async (ui: { drawn: () => Promise<unknown> }) => {
  const tree = (await ui.drawn()) as { children: unknown[] }
  return tree.children.map(flat)
}

// The props of the innermost Text showing exactly `text`.
const propsOf = async (ui: { findAll: (q: { type: string }) => Promise<{ text: string; props: Record<string, unknown> }[]> }, text: string) =>
  (await ui.findAll({ type: 'Text' })).filter(t => t.text === text).at(-1)?.props

const mount = ($: Engine, surface: 'terminal' | 'desktop' = 'terminal') =>
  $.ui.mount({ plugin: 'usage-band', surface, component: 'AbovePrompt', props: BAND })

describe('usage-band', () => {
  for (const surface of ['terminal', 'desktop'] as const) {
    test(`draws the top row and the context runway on ${surface}`, async ($, on) => {
      await start($, on, usage(68, 41, 18), { burn: 83.67, today: 59.4, argv: [] })
      const ui = await mount($, surface)
      const [top, bottom] = await rows(ui)
      // 41% over the 2h47m the window has run: 14.7%/h.
      expect(top).toBe('opus 5.5   +15%/h $83.67/h   today $59.40')
      const tail = ' 68% ctx   5h ◑ 41%  wk ◔ 18%'
      expect(bottom?.endsWith(tail)).toBe(true)
      const runway = (bottom ?? '').slice(0, -tail.length)
      // Two blank cells kept at the left of the band's 140, one at the right.
      expect([...runway]).toHaveLength(137 - tail.length)
      expect(runway.match(/━/g)?.length).toBe(Math.round(0.68 * (137 - tail.length)))
      expect((await ui.drawn()) as unknown).toMatchObject({ props: { paddingLeft: 2, paddingRight: 1 } })
      expect((await ui.findAll({ type: 'Text' })).find(t => t.text === '━')?.props.color).toBe('#56b6c2')
      expect((await propsOf(ui, 'opus 5.5'))?.color).toBe('claude')
      expect((await propsOf(ui, ' 68%'))?.color).toBe('green')
    })
  }

  test('%/h is the last hour’s rise once there is 15 minutes of history', async ($, on) => {
    const clock = await start($, on, usage(20, 10, 5), { burn: 10, today: 5, argv: [] })
    const ui = await mount($)
    await clock.advance(20 * MIN)
    await measure($, usage(21, 20, 5))
    // 10 points in 20 minutes.
    expect((await rows(ui))[0]).toContain('+30%/h')
  })

  test('%/h falls while the session sits idle', async ($, on) => {
    const clock = await start($, on, usage(20, 10, 5), { burn: 10, today: 5, argv: [] })
    const ui = await mount($)
    await clock.advance(20 * MIN)
    await measure($, usage(21, 20, 5))
    await clock.advance(20 * MIN)
    // Still 10 points, now over 40 minutes; the ccusage timer redrew the band meanwhile.
    expect((await rows(ui))[0]).toContain('+15%/h')
  })

  test('a pace that reaches the limit before the reset is red', async ($, on) => {
    const clock = await start($, on, usage(20, 50, 5), { burn: 10, today: 5, argv: [] })
    const ui = await mount($)
    // 50% left over 2h13m holds 22.6%/h. 30 points in 20 minutes is 90%/h.
    await clock.advance(20 * MIN)
    await measure($, usage(21, 80, 5))
    expect((await propsOf(ui, '+90%/h'))?.color).toBe('error')
  })

  test('without a 5-hour limit (an API key) the band shows $/h in its place', async ($, on) => {
    await start($, on, { ...usage(20, 0, 0), rateLimits: [] }, { burn: 42.5, today: 5, argv: [] })
    const ui = await mount($)
    const [top, bottom] = await rows(ui)
    expect(top).toBe('opus 5.5   $42.50/h   today $5.00')
    expect(bottom?.endsWith(' 20% ctx')).toBe(true)
    expect((await propsOf(ui, '$42.50/h'))?.color).toBe('yellow')
  })

  test('figures past 80% take a level color, and the 5h reset appears', async ($, on) => {
    await start($, on, usage(30, 10, 5), { burn: 20, today: 10, argv: [] })
    const ui = await mount($)
    await measure($, usage(93, 85, 50))
    expect((await rows(ui))[1]).toContain('5h ◕ 85% · resets 2h13m')
    expect((await propsOf(ui, ' 93%'))?.color).toBe('error')
    expect((await propsOf(ui, '◕ 85%'))?.color).toBe('warning')
    expect((await propsOf(ui, '◑ 50%'))?.color).toBe('blueBright')
  })

  test('the effort a main-thread request is sent with shows after the model', async ($, on) => {
    await start($, on, usage(20, 5, 5), { burn: 5, today: 3, argv: [] })
    const step = async (eff: 'high' | 'low', agentId?: string) => {
      for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', effort: eff, messageCount: 1, ...(agentId ? { agentId } : {}) })) {
        // drain
      }
    }
    await step('high')
    await step('low', 'subagent-1')
    const ui = await mount($)
    expect((await rows(ui))[0]).toMatch(/^opus 5\.5 high {3}/)
  })

  test('before any request, the effort settings name for the model shows', async ($, on) => {
    const w: World = { burn: 5, today: 3, argv: [], settings: { modelSettings: { 'claude-opus-5-5': { effortLevel: 'medium' } } } }
    await start($, on, usage(20, 5, 5), w)
    const ui = await mount($)
    expect((await rows(ui))[0]).toMatch(/^opus 5\.5 medium {3}/)
  })

  test('/clear, /resume and /branch fill the band again, effort and ccusage included', async ($, on) => {
    const w: World = { burn: 10, today: 5, argv: [] }
    await start($, on, usage(20, 5, 5), w)
    const ui = await mount($)
    expect((await rows(ui))[0]).toMatch(/^opus 5\.5 {3}/)
    w.settings = { effortLevel: 'max' }
    const reads = w.usageReads ?? 0
    const runs = w.argv.length
    for (const source of ['clear', 'resume', 'fork'] as const) {
      await $.classic.SessionStart({ source })
    }
    expect(w.usageReads).toBe(reads + 3)
    expect(w.argv.length).toBe(runs + 6)
    expect((await rows(ui))[0]).toMatch(/^opus 5\.5 max {3}/)
  })

  test('ccusage runs offline, and a turn asks again only after the gap', async ($, on) => {
    const w: World = { burn: 10, today: 5, argv: [] }
    const clock = await start($, on, usage(20, 5, 5), w)
    expect(w.argv).toHaveLength(2)
    expect(w.argv.every(a => a.includes('--offline'))).toBe(true)
    await measure($, usage(21, 5, 5))
    expect(w.argv).toHaveLength(2)
    await clock.advance(31_000)
    await measure($, usage(22, 5, 5))
    expect(w.argv).toHaveLength(4)
  })

  test('a $0 day while the session has spent says the model is unpriced', async ($, on) => {
    await start($, on, usage(20, 5, 5, 2.5), { burn: 0, today: 0, argv: [] })
    const ui = await mount($)
    expect((await rows(ui))[0]).toContain('today $0 · model not priced in ccusage')
  })
})

describe('format', () => {
  test('model ids read as lower-case names', () => {
    expect(modelLabel('claude-opus-5-5')).toBe('opus 5.5')
    expect(modelLabel('claude-haiku-4-5-20251001')).toBe('haiku 4.5')
    expect(modelLabel('claude-opus-4-20250514')).toBe('opus 4')
    expect(modelLabel('claude-fable-5-1[1m]')).toBe('fable 5.1')
  })

  test('pies step by quarters', () => {
    expect([0, 12, 13, 37, 38, 62, 63, 87, 88, 100].map(pieFigure)).toEqual([
      '○ 0%', '○ 12%', '◔ 13%', '◔ 37%', '◑ 38%', '◑ 62%', '◕ 63%', '◕ 87%', '● 88%', '● 100%',
    ])
  })

  test('the 5-hour history starts over with a new window and skips unchanged readings', () => {
    const a = recordFive([], 10, 'R1', 'R1', 0)
    expect(a).toEqual([{ at: 0, percentUsed: 10 }])
    expect(recordFive(a, 10, 'R1', 'R1', MIN)).toEqual(a)
    expect(recordFive(a, 12, 'R1', 'R1', MIN)).toEqual([...a, { at: MIN, percentUsed: 12 }])
    expect(recordFive(a, 3, 'R2', 'R1', MIN)).toEqual([{ at: MIN, percentUsed: 3 }])
    expect(recordFive(a, 5, 'R1', 'R1', MIN)).toEqual([{ at: MIN, percentUsed: 5 }])
  })

  test('%/h: trailing hour with history, window average without, null when unknown', () => {
    const reset = new Date(3 * HOUR).toISOString() // the window began 2 h before 0
    expect(fiveHourRate([{ at: 0, percentUsed: 10 }], 20, reset, 20 * MIN)).toBe(30)
    // 5 minutes of history is too little: 20% over the 2h05m the window has run.
    expect(Math.round((fiveHourRate([{ at: 0, percentUsed: 10 }], 20, reset, 5 * MIN) ?? 0) * 100)).toBe(960)
    expect(fiveHourRate([], 20, null, 0)).toBe(null)
    expect(fiveHourRate([], 1, new Date(5 * HOUR - 5 * MIN).toISOString(), 0)).toBe(null)
  })

  test('rate level: red when the pace beats what the remaining hours allow', () => {
    const reset = new Date(2 * HOUR).toISOString() // 50% left over 2 h holds 25%/h
    expect(rateLevel(26, 50, reset, 0)).toBe('error')
    expect(rateLevel(21, 50, reset, 0)).toBe('warning')
    expect(rateLevel(19, 50, reset, 0)).toBe('success')
    expect(rateLevel(99, 50, null, 0)).toBe('success')
  })

  test('runway colors run teal to red', () => {
    expect(runwayColor(0, 10)).toBe('#56b6c2')
    expect(runwayColor(9, 10)).toBe('#e06c75')
    expect(runwayColor(0, 1)).toBe('#56b6c2')
  })

  test('effort from settings: per model first, then the global level', () => {
    const settings = { effortLevel: 'low', modelSettings: { 'claude-opus-5-5': { effortLevel: 'medium' } } }
    expect(effortFromSettings(settings, 'claude-opus-5-5')).toBe('medium')
    expect(effortFromSettings(settings, 'claude-opus-5-5[1m]')).toBe('medium')
    expect(effortFromSettings(settings, 'claude-sonnet-5-5')).toBe('low')
    expect(effortFromSettings({}, 'claude-opus-5-5')).toBe(null)
  })

  test('ccusage output and reset times', () => {
    expect(parseBurn(blocksJson(83.67))).toBe(83.67)
    expect(parseBurn(JSON.stringify({ blocks: [] }))).toBe(null)
    expect(parseToday(dailyJson(59.4))).toBe(59.4)
    expect(parseToday(JSON.stringify({ daily: [] }))).toBe(null)
    expect(sinceArg(Date.parse('2026-10-07T03:00:00Z'))).toBe('20261006')
    expect(resetIn(new Date(HOUR + 5 * MIN).toISOString(), 0)).toBe('1h05m')
  })
})
