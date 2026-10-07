import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, SessionUsage } from 'claude-code'

import { dialDelayMs, isBurnHot, modelLabel, parseBurn, parseToday, pieFigure, resetIn, sinceArg, trendOf } from '../hooks/format'

const HOUR = 3_600_000

const usage = (ctx: number, five: number, seven: number, usd = 1.42): SessionUsage => ({
  startedAt: 0,
  context: { tokens: ctx * 2000, window: 200_000, percent: ctx },
  rateLimits: [
    { kind: 'five_hour', percentUsed: five, resetsAt: new Date(2 * HOUR + 13 * 60_000).toISOString() },
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

type Ccusage = { burn: number; today: number; argv: string[][] }

const start = async ($: Engine, on: On, u: SessionUsage, cc: Ccusage) => {
  const clock = mock.clock(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({ value: u }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.step', async function* (_$, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: null }
  })
  on('process.run', (_$, e) => {
    cc.argv.push([...e.argv])
    const stdout = e.argv.includes('blocks') ? blocksJson(cc.burn) : dailyJson(cc.today)
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  await $.session.start({ cwd: '/w', surface: 'terminal', isInteractive: true })
  await clock.settle()
  return clock
}

// The drawn tree's text, its string children joined in order: what the band reads as.
const flat = (node: unknown): string =>
  typeof node === 'string'
    ? node
    : node !== null && typeof node === 'object' && 'children' in node && Array.isArray(node.children)
      ? node.children.map(flat).join('')
      : ''

// The props of the innermost Text showing exactly `text` (outer Texts show it too, inside more).
const propsOf = async (ui: { findAll: (q: { type: string }) => Promise<{ text: string; props: Record<string, unknown> }[]> }, text: string) =>
  (await ui.findAll({ type: 'Text' })).filter(t => t.text === text).at(-1)?.props

const mount = ($: Engine, surface: 'terminal' | 'desktop' = 'terminal') =>
  $.ui.mount({ plugin: 'usage-band', surface, component: 'AbovePrompt', props: BAND })

describe('usage-band', () => {
  for (const surface of ['terminal', 'desktop'] as const) {
    test(`draws one quiet line on ${surface}`, async ($, on) => {
      await start($, on, usage(68, 41, 18), { burn: 83.67, today: 59.4, argv: [] })
      const ui = await mount($, surface)
      // The dial's frame depends on how far it has turned; any quarter will do here.
      expect(flat(await ui.drawn()).replace(/[◜◝◞◟]/, '◜')).toBe(
        'opus 5.5  ·  context ◕ 68%  ·  5h ◑ 41%  ·  week ◔ 18%  ·  ◜ $83.67/h  ·  today $59.40',
      )
      expect((await propsOf(ui, 'opus 5.5'))?.color).toBe('claude')
      expect((await propsOf(ui, '◕ 68%'))?.color).toBe('green')
      expect((await propsOf(ui, '◑ 41%'))?.color).toBe('cyan')
      expect((await propsOf(ui, '◔ 18%'))?.color).toBe('blueBright')
      expect((await propsOf(ui, ' $83.67/h'))?.color).toBe('yellow')
      expect((await propsOf(ui, '$59.40'))?.color).toBe('magenta')
      expect((await propsOf(ui, 'context '))?.dimColor).toBe(true)
    })
  }

  test('figures past 80% take a level color, and the 5h reset appears', async ($, on) => {
    await start($, on, usage(30, 10, 5), { burn: 20, today: 10, argv: [] })
    const ui = await mount($)
    await $.session.measure({ ...usage(93, 85, 50), changed: ['context', 'rateLimits'] })
    const text = flat(await ui.drawn())
    expect(text).toContain('5h ◕ 85% · resets 2h13m')
    expect((await propsOf(ui, '● 93%'))?.color).toBe('error')
    expect((await propsOf(ui, '◕ 85%'))?.color).toBe('warning')
    expect((await propsOf(ui, '◑ 50%'))?.color).toBe('blueBright')
  })

  test('the effort a main-thread request is sent with shows after the model', async ($, on) => {
    await start($, on, usage(20, 5, 5), { burn: 5, today: 3, argv: [] })
    const step = async (effort: 'high' | 'low', agentId?: string) => {
      for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', effort, messageCount: 1, ...(agentId ? { agentId } : {}) })) {
        // drain
      }
    }
    await step('high')
    await step('low', 'subagent-1')
    const ui = await mount($)
    expect(flat(await ui.drawn())).toMatch(/^opus 5\.5 high {2}·/)
  })

  test('ccusage runs offline, and a turn asks again only after the gap', async ($, on) => {
    const cc: Ccusage = { burn: 10, today: 5, argv: [] }
    const clock = await start($, on, usage(20, 5, 5), cc)
    expect(cc.argv).toHaveLength(2)
    expect(cc.argv.every(a => a.includes('--offline'))).toBe(true)
    await $.session.measure({ ...usage(21, 5, 5), changed: ['context'] })
    expect(cc.argv).toHaveLength(2)
    await clock.advance(31_000)
    await $.session.measure({ ...usage(22, 5, 5), changed: ['context'] })
    expect(cc.argv).toHaveLength(4)
  })

  test('a burn rate past 1.5x its average turns red', async ($, on) => {
    const cc: Ccusage = { burn: 20, today: 5, argv: [] }
    const clock = await start($, on, usage(20, 5, 5), cc)
    for (const burn of [20, 22, 90]) {
      cc.burn = burn
      await clock.advance(120_000)
    }
    const ui = await mount($)
    expect((await propsOf(ui, ' $90.00/h'))?.color).toBe('error')
  })

  test('the dial turns a quarter per tick, faster at a higher burn rate, with the trend after it', async ($, on) => {
    const cc: Ccusage = { burn: 80, today: 5, argv: [] }
    const clock = await start($, on, usage(20, 5, 5), cc)
    const ui = await mount($)
    const dial = async () => flat(await ui.drawn()).match(/[◜◝◞◟]/)?.[0]
    const first = await dial()
    await clock.advance(250)
    const second = await dial()
    expect(second).not.toBe(first)
    await clock.advance(250)
    expect(await dial()).not.toBe(second)

    cc.burn = 100
    await clock.advance(120_000)
    expect(flat(await ui.drawn())).toContain('$100.00/h ↑')
    expect((await propsOf(ui, ' ↑'))?.color).toBe('redBright')
  })

  test('a $0 day while the session has spent says the model is unpriced', async ($, on) => {
    await start($, on, usage(20, 5, 5, 2.5), { burn: 0, today: 0, argv: [] })
    const ui = await mount($)
    expect(flat(await ui.drawn())).toContain('today $0 · model not priced in ccusage')
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

  test('dial pace and trend arrows', () => {
    expect(dialDelayMs(80)).toBe(250)
    expect(dialDelayMs(20)).toBe(1000)
    expect(dialDelayMs(1000)).toBe(125)
    expect(dialDelayMs(1)).toBe(2000)
    expect(trendOf([80])).toBe(null)
    expect(trendOf([80, 100])?.arrow).toBe('↑')
    expect(trendOf([80, 85])?.arrow).toBe('↗')
    expect(trendOf([80, 81])?.arrow).toBe('→')
    expect(trendOf([80, 77])?.arrow).toBe('↘')
    expect(trendOf([80, 60])?.arrow).toBe('↓')
  })

  test('ccusage output, reset times and the burn threshold', () => {
    expect(parseBurn(blocksJson(83.67))).toBe(83.67)
    expect(parseBurn(JSON.stringify({ blocks: [] }))).toBe(null)
    expect(parseToday(dailyJson(59.4))).toBe(59.4)
    expect(parseToday(JSON.stringify({ daily: [] }))).toBe(null)
    expect(sinceArg(Date.parse('2026-10-07T03:00:00Z'))).toBe('20261006')
    expect(resetIn(new Date(HOUR + 5 * 60_000).toISOString(), 0)).toBe('1h05m')
    expect(isBurnHot(90, [20, 22, 90])).toBe(true)
    expect(isBurnHot(30, [20, 22, 30])).toBe(false)
    expect(isBurnHot(90, [20, 90])).toBe(false)
  })
})
