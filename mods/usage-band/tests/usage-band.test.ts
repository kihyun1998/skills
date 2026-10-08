import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, RenderElement, SessionUsage } from 'claude-code'

import {
  budgetLevel,
  cacheHit,
  dayOf,
  dayStartOf,
  daysLeft,
  midnightOf,
  nextDayStart,
  weekBudget,
  weekHead,
  clockOf,
  runsOutAt,
  effortFromSettings,
  WINDOW_MS,
  evenPace,
  gaugeCells,
  gaugeWidth,
  fiveHourRate,
  modelLabel,
  parseBurn,
  parseToday,
  paceLevel,
  paceOf,
  recordFive,
  sinceArg,
} from '../hooks/format'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

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
  /** What each main-thread request reports of its prompt; none by default. */
  stepUsage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }
  /** What the log tally answers: this machine's tokens since the week began and since today began; it fails when absent. */
  tally?: { window: number; today: number }
  /** What $.store holds when the session starts, as an earlier one left it. */
  store?: Record<string, unknown>
  /** What the bands beneath draw; nothing by default. */
  beneath?: RenderElement
}

const start = async ($: Engine, on: On, u: SessionUsage, w: World) => {
  const clock = mock.clock(on)
  mock.store(on, w.store)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => {
    w.usageReads = (w.usageReads ?? 0) + 1
    return { value: u }
  })
  on('settings.read', () => ({ value: w.settings ?? {} }))
  on('classic.SessionStart', () => ({}))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.compact', () => ({ messages: [SUMMARY] }))
  on('turn.step', async function* (_$, e) {
    const usage = w.stepUsage ? { ...w.stepUsage, model: 'claude-opus-5-5' } : null
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage }
  })
  // Whatever the bands beneath draw; nothing by default.
  on('ui.render', { component: 'AbovePrompt' }, (): RenderElement => w.beneath ?? { type: 'Box', props: {}, children: [] })
  on('process.run', (_$, e) => {
    w.argv.push([...e.argv])
    if (e.argv.some(a => a.endsWith('tally.mjs'))) {
      const out = w.tally === undefined ? null : JSON.stringify(w.tally)
      return { value: { exitCode: out === null ? 1 : 0, stdout: out ?? '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    }
    const stdout = e.argv.includes('blocks') ? blocksJson(w.burn) : dailyJson(w.today)
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  await $.session.start({ cwd: '/w', surface: 'terminal', isInteractive: true })
  await clock.settle()
  return clock
}

// What a compaction leaves: its summary.
const SUMMARY = { role: 'user' as const, text: 'summary', toolUses: [] }

const measure = ($: Engine, u: SessionUsage) => $.session.measure({ ...u, changed: ['context', 'rateLimits'] })

// A drawn tree's text, its string children joined in order.
const flat = (node: unknown): string =>
  typeof node === 'string'
    ? node
    : node !== null && typeof node === 'object' && 'children' in node && Array.isArray(node.children)
      ? node.children.map(flat).join('')
      : ''

// The divider between two columns.
const DIV = '  │  '

// The band's own Box: the last child, under whatever the bands beneath drew.
const own = async (ui: { drawn: () => Promise<unknown> }) => {
  const tree = (await ui.drawn()) as { children: unknown[] }
  return tree.children.at(-1) as { props: Record<string, unknown>; children: unknown[] }
}

// The band's rows, each flattened.
const rows = async (ui: { drawn: () => Promise<unknown> }) => (await own(ui)).children.map(flat)

// The props of the innermost Text showing exactly `text`.
const propsOf = async (ui: { findAll: (q: { type: string }) => Promise<{ text: string; props: Record<string, unknown> }[]> }, text: string) =>
  (await ui.findAll({ type: 'Text' })).filter(t => t.text === text).at(-1)?.props

const mount = ($: Engine, surface: 'terminal' | 'desktop' = 'terminal') =>
  $.ui.mount({ plugin: 'usage-band', surface, component: 'AbovePrompt', props: BAND })

describe('usage-band', () => {
  for (const surface of ['terminal', 'desktop'] as const) {
    test(`draws the top row and the three gauges on ${surface}`, async ($, on) => {
      await start($, on, usage(68, 41, 18), { burn: 83.67, today: 59.4, argv: [] })
      const ui = await mount($, surface)
      const [top, bottom] = await rows(ui)
      // Two blank cells kept at the left of the band's 140 and one at the right leave 137: three columns
      // of 42 with a 5-cell divider between, each gauge a 4-cell label, a 33-cell bar and a 5-cell figure.
      // 41% used with 2h47m of the 5h gone (55.7%): a 74% pace. The week here has no reset time, so no pace.
      const resets = clockOf(Date.parse(RESETS_AT))
      expect(top).toBe(['opus 5.5', `74% pace · resets ${resets}`, 'today $59.40 · $83.67/h'].map(h => h.padEnd(42)).join(DIV))
      const [ctx, five, week] = (bottom ?? '').split(DIV)
      expect([ctx, five, week].map(g => [...(g ?? '')].length)).toEqual([42, 42, 42])
      expect(ctx?.startsWith('ctx ')).toBe(true)
      expect(ctx?.endsWith('  68%')).toBe(true)
      expect(ctx?.match(/━/g)?.length).toBe(Math.round(0.68 * 33))
      expect(five?.startsWith('5h  ')).toBe(true)
      expect(week).toMatch(/^wk {2}.* {2}18%$/)
      expect((await own(ui)) as unknown).toMatchObject({ props: { paddingLeft: 2, paddingRight: 1 } })
      // Quiet while nothing is past 80%: the fill and the figure take the terminal's own colour.
      expect((await ui.findAll({ type: 'Text' })).find(t => t.text === '━')?.props.color).toBe(undefined)
      expect((await propsOf(ui, 'opus 5.5'))?.color).toBe('claude')
      expect((await propsOf(ui, '  68%'))?.color).toBe(undefined)
    })
  }

  test('the 5-hour gauge marks where an even pace would have it', async ($, on) => {
    await start($, on, usage(68, 41, 18), { burn: 10, today: 5, argv: [] })
    const ui = await mount($)
    const five = (await rows(ui))[1]?.split(DIV)[1] ?? ''
    // 2h47m of the window gone is 55.7%: cell 18 of the 33, past the 14 that 41% fills.
    const bar = [...five].slice(4, 4 + 33)
    expect(bar.indexOf('┊')).toBe(18)
    expect(bar.filter(c => c === '━')).toHaveLength(14)
    // The week here comes with no reset time, so its gauge has none.
    expect((await rows(ui))[1]?.match(/┊/g)).toHaveLength(1)
  })

  test('the week shows today’s budget: what was left at the day’s start over the days to the reset', async ($, on) => {
    const u = usage(20, 41, 18)
    const resetsAt = new Date(48 * HOUR).toISOString()
    const withWeek = (used: number): SessionUsage => ({ ...u, rateLimits: [u.rateLimits[0]!, { kind: 'seven_day', percentUsed: used, resetsAt }] })
    await start($, on, withWeek(18), { burn: 10, today: 5, argv: [] })
    const ui = await mount($)
    const days = daysLeft(resetsAt, 0)
    const budget = 82 / days
    const wk = async () => ((await rows(ui))[0] ?? '').split(DIV)[2] ?? ''
    // The money follows, its "today" said once.
    expect((await wk()).startsWith(`today 0% of ${Math.round(budget)}% · $5.00 · $10.00/h`)).toBe(true)
    expect((await propsOf(ui, `today 0% of ${Math.round(budget)}%`))?.color).toBe(undefined)
    // The week's gauge marks where today's budget runs out; no pace is drawn for the week.
    const bar = [...((await rows(ui))[1]?.split(DIV)[2] ?? '')].slice(4, 4 + 33)
    expect(bar.indexOf('┊')).toBe(Math.min(32, Math.round(((18 + budget) / 100) * 33)))
    expect(await wk()).not.toContain('pace')
    // Past it: red, and what tomorrow is left with.
    const over = 18 + Math.ceil(budget) + 3
    await measure($, withWeek(over))
    const text = `today ${over - 18}% of ${Math.round(budget)}%`
    expect(await wk()).toContain(`${text} · tomorrow ${Math.round((100 - over) / (days - 1))}%`)
    expect((await propsOf(ui, text))?.color).toBe('error')
  })

  test('where today began, kept by an earlier session, is taken up by the next: the budget does not move within the day', async ($, on) => {
    const u = usage(20, 41, 18)
    const resetsAt = new Date(48 * HOUR).toISOString()
    // An earlier session today saw the week at 10%; this one starts at 18%.
    const store = { dayStart: { day: dayOf(0), used: 10, lastUsed: 18, resetsAt } }
    await start($, on, { ...u, rateLimits: [u.rateLimits[0]!, { kind: 'seven_day', percentUsed: 18, resetsAt }] }, { burn: 10, today: 5, argv: [], store })
    const ui = await mount($)
    const budget = Math.round(90 / daysLeft(resetsAt, 0))
    expect(((await rows(ui))[0] ?? '').split(DIV)[2]).toContain(`today 8% of ${budget}%`)
  })

  test('a day’s start from another day is not today’s', async ($, on) => {
    const u = usage(20, 41, 18)
    const resetsAt = new Date(48 * HOUR).toISOString()
    const store = { dayStart: { day: dayOf(-2 * DAY), used: 10, lastUsed: 10, resetsAt } }
    await start($, on, { ...u, rateLimits: [u.rateLimits[0]!, { kind: 'seven_day', percentUsed: 18, resetsAt }] }, { burn: 10, today: 5, argv: [], store })
    const ui = await mount($)
    expect(((await rows(ui))[0] ?? '').split(DIV)[2]).toContain('today 0% of ')
  })

  test('on a day whose start came late (the first day, say), today is estimated from this machine’s logs, marked ~', async ($, on) => {
    const u = usage(20, 41, 30)
    const resetsAt = new Date(48 * HOUR).toISOString()
    const w: World = { burn: 10, today: 5, argv: [], tally: { window: 100, today: 40 } }
    await start($, on, { ...u, rateLimits: [u.rateLimits[0]!, { kind: 'seven_day', percentUsed: 30, resetsAt }] }, w)
    const ui = await mount($)
    // 40% of the week's tokens fell today: 12 of its 30%, so today began at 18%.
    const budget = Math.round(82 / daysLeft(resetsAt, 0))
    expect(((await rows(ui))[0] ?? '').split(DIV)[2]).toContain(`today ~12% of ${budget}%`)
    // Asked for the week since it began and today since midnight, or since the week began if later.
    const run = w.argv.find(a => a.some(x => x.endsWith('tally.mjs')))
    expect(run?.slice(-2)).toEqual([String(Date.parse(resetsAt) - 7 * DAY), String(Math.max(midnightOf(0), Date.parse(resetsAt) - 7 * DAY))])
  })

  test('a day carried on from the last reading of the day before is exact: no estimate, no ~', async ($, on) => {
    const u = usage(20, 41, 30)
    const resetsAt = new Date(48 * HOUR).toISOString()
    const store = { dayStart: { day: dayOf(-DAY), used: 20, lastUsed: 30, resetsAt } }
    const w: World = { burn: 10, today: 5, argv: [], tally: { window: 100, today: 40 }, store }
    await start($, on, { ...u, rateLimits: [u.rateLimits[0]!, { kind: 'seven_day', percentUsed: 30, resetsAt }] }, w)
    const ui = await mount($)
    expect(((await rows(ui))[0] ?? '').split(DIV)[2]).toContain(`today 0% of ${Math.round(70 / daysLeft(resetsAt, 0))}%`)
    expect(w.argv.some(a => a.some(x => x.endsWith('tally.mjs')))).toBe(false)
  })

  test('when the logs cannot be read, today counts from the first reading, unmarked', async ($, on) => {
    const u = usage(20, 41, 30)
    const resetsAt = new Date(48 * HOUR).toISOString()
    await start($, on, { ...u, rateLimits: [u.rateLimits[0]!, { kind: 'seven_day', percentUsed: 30, resetsAt }] }, { burn: 10, today: 5, argv: [] })
    const ui = await mount($)
    expect(((await rows(ui))[0] ?? '').split(DIV)[2]).toContain(`today 0% of ${Math.round(70 / daysLeft(resetsAt, 0))}%`)
  })

  test('a start kept by the first version, with no last reading, is read as none: the day is estimated', async ($, on) => {
    const u = usage(20, 41, 30)
    const resetsAt = new Date(48 * HOUR).toISOString()
    const store = { dayStart: { day: dayOf(0), used: 30, resetsAt } }
    const w: World = { burn: 10, today: 5, argv: [], tally: { window: 100, today: 40 }, store }
    await start($, on, { ...u, rateLimits: [u.rateLimits[0]!, { kind: 'seven_day', percentUsed: 30, resetsAt }] }, w)
    const ui = await mount($)
    expect(((await rows(ui))[0] ?? '').split(DIV)[2]).toContain('today ~12% of ')
  })

  test('what the first version kept under weekStart is never read: the day is estimated', async ($, on) => {
    const u = usage(20, 41, 30)
    const resetsAt = new Date(48 * HOUR).toISOString()
    const store = { weekStart: { day: dayOf(0), used: 30, lastUsed: 30, resetsAt } }
    const w: World = { burn: 10, today: 5, argv: [], tally: { window: 100, today: 40 }, store }
    await start($, on, { ...u, rateLimits: [u.rateLimits[0]!, { kind: 'seven_day', percentUsed: 30, resetsAt }] }, w)
    const ui = await mount($)
    expect(((await rows(ui))[0] ?? '').split(DIV)[2]).toContain('today ~12% of ')
  })

  test('another band stays above the two rows, which keep next to the prompt', async ($, on) => {
    const beneath: RenderElement = { type: 'Text', props: {}, children: ['thegraph #42'] }
    await start($, on, usage(30, 10, 5), { burn: 10, today: 5, argv: [], beneath })
    const ui = await mount($)
    const tree = (await ui.drawn()) as { children: unknown[] }
    expect(tree.children.map(flat)[0]).toBe('thegraph #42')
    expect((await rows(ui))[0]?.startsWith('opus 5.5')).toBe(true)
  })

  test('the 5-hour limit leads with its pace: the share used over the share of its window gone', async ($, on) => {
    await start($, on, usage(20, 41, 18), { burn: 10, today: 5, argv: [] })
    const ui = await mount($)
    const [, five] = ((await rows(ui))[0] ?? '').split(DIV)
    expect(five?.startsWith('74% pace · resets ')).toBe(true)
    // %/h no longer shows; under 80% the pace takes no colour.
    expect((await rows(ui))[0]).not.toContain('%/h')
    expect((await propsOf(ui, '74% pace'))?.color).toBe(undefined)
  })

  test('a pace past 80% warns, and past 100% is red', async ($, on) => {
    await start($, on, usage(20, 50, 5), { burn: 10, today: 5, argv: [] })
    const ui = await mount($)
    // 50% over 55.7% gone is 90%; 60% is 108%.
    expect((await propsOf(ui, '90% pace'))?.color).toBe('warning')
    await measure($, usage(20, 60, 5))
    expect((await propsOf(ui, '108% pace'))?.color).toBe('error')
  })

  test('a last hour that runs the limit out before the reset says when, after the pace', async ($, on) => {
    const clock = await start($, on, usage(20, 50, 5), { burn: 10, today: 5, argv: [] })
    const ui = await mount($)
    // 50% left over 2h13m holds 22.6%/h. 30 points in 20 minutes is 90%/h: the last 20% go in 13m20s.
    await clock.advance(20 * MIN)
    await measure($, usage(21, 80, 5))
    const out = clockOf(20 * MIN + (20 / 90) * HOUR)
    expect((await propsOf(ui, `out at ${out}`))?.color).toBe('error')
    // 80% with 3h07m gone (62.3%) is a 128% pace; the forecast follows it.
    expect((await rows(ui))[0]).toContain(`128% pace · out at ${out} · resets ${clockOf(Date.parse(RESETS_AT))}`)
    expect((await rows(ui))[0]).not.toContain('%/h')
  })

  test('the cache hit rate shows beside the model, over the latest main-thread requests', async ($, on) => {
    const world: World = { burn: 5, today: 3, argv: [], stepUsage: { input_tokens: 2_000, output_tokens: 500, cache_read_input_tokens: 93_000, cache_creation_input_tokens: 5_000 } }
    await start($, on, usage(20, 5, 5), world)
    const step = async (agentId?: string) => {
      for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 1, ...(agentId ? { agentId } : {}) })) {
        // drain
      }
    }
    await step()
    // A subagent's request, all of it uncached, is not the main thread's cache.
    world.stepUsage = { input_tokens: 100_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
    await step('subagent-1')
    const ui = await mount($)
    // In the context column, after the model; quiet at 80% and above.
    expect((await rows(ui))[0]).toMatch(/^opus 5\.5 high · cache 93% /)
    expect((await propsOf(ui, '93%'))?.color).toBe(undefined)
  })

  test('without a 5-hour limit (an API key) the band shows $/h in its place', async ($, on) => {
    await start($, on, { ...usage(20, 0, 0), rateLimits: [] }, { burn: 42.5, today: 5, argv: [] })
    const ui = await mount($)
    const [top, bottom] = await rows(ui)
    // Context alone takes the whole row, the money after the model in its head.
    expect(top).toBe('opus 5.5 · today $5.00 · $42.50/h'.padEnd(137))
    expect(bottom).toMatch(/^ctx .* {2}20%$/)
    expect([...(bottom ?? '')]).toHaveLength(137)
    // With no %/h beside it, $/h is not dimmed.
    expect((await propsOf(ui, '$42.50/h'))?.dimColor).not.toBe(true)
  })

  test('only figures past 80% take a colour, the level\'s', async ($, on) => {
    await start($, on, usage(30, 10, 5), { burn: 20, today: 10, argv: [] })
    const ui = await mount($)
    await measure($, usage(93, 85, 50))
    expect((await propsOf(ui, '  93%'))?.color).toBe('error')
    expect((await propsOf(ui, '  85%'))?.color).toBe('warning')
    expect((await propsOf(ui, '  50%'))?.color).toBe(undefined)
    // The fill of a loud gauge takes its level too.
    expect((await ui.findAll({ type: 'Text' })).filter(t => t.text === '━').map(t => t.props.color)).toContain('error')
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

  test('a compaction of the main conversation empties the context gauge at once', async ($, on) => {
    const u = usage(68, 5, 5)
    await start($, on, u, { burn: 10, today: 5, argv: [] })
    const ui = await mount($)
    const ctx = async () => (await rows(ui))[1]?.split(DIV)[0] ?? ''
    expect(await ctx()).toMatch(/ {2}68%$/)
    // The engine reports no fill for a just-compacted window until its next response.
    u.context = { window: 200_000 }
    // A precompute and a subagent's compaction leave the main conversation as it was.
    await $.session.compact({ trigger: 'precompute', messages: [SUMMARY] })
    await $.session.compact({ trigger: 'auto', agentId: 'a1', messages: [SUMMARY] })
    expect(await ctx()).toMatch(/ {2}68%$/)
    await $.session.compact({ trigger: 'manual', messages: [SUMMARY] })
    expect(await ctx()).toMatch(/ {3}0%$/)
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

  test('gauges: cells filled to the share used, the mark over its cell, widths split evenly', () => {
    expect(gaugeCells(10, 40, null).join(' ')).toBe('fill fill fill fill empty empty empty empty empty empty')
    expect(gaugeCells(10, 40, 70).indexOf('mark')).toBe(7)
    expect(gaugeCells(10, 90, 30)[3]).toBe('mark')
    expect(gaugeCells(10, 100, 100).at(-1)).toBe('mark')
    expect(gaugeWidth(137, 3, 4)).toBe(43)
    expect(gaugeWidth(137, 1, 4)).toBe(137)
  })

  test('the forecast: a time only when the limit runs out before the reset', () => {
    const reset = new Date(2 * HOUR).toISOString()
    // 40% left at 30%/h: out in 80 minutes, before the reset in 120.
    expect(runsOutAt(30, 60, reset, 0)).toBe(80 * MIN)
    // At 15%/h the 40% last 160 minutes: past the reset, so nothing to say.
    expect(runsOutAt(15, 60, reset, 0)).toBe(null)
    expect(runsOutAt(0, 60, reset, 0)).toBe(null)
    expect(runsOutAt(30, 60, null, 0)).toBe(null)
  })

  test('the cache hit rate: what the cache served of every prompt token', () => {
    expect(cacheHit([{ read: 90, written: 5, uncached: 5 }, { read: 0, written: 100, uncached: 0 }])).toBe(45)
    expect(cacheHit([])).toBe(null)
  })

  test('even pace: the share of a window gone, null when unknown or past', () => {
    expect(evenPace(new Date(2 * HOUR).toISOString(), WINDOW_MS.fiveHour, 0)).toBe(60)
    expect(evenPace(new Date(5 * HOUR).toISOString(), WINDOW_MS.fiveHour, 0)).toBe(0)
    expect(evenPace(new Date(84 * HOUR).toISOString(), WINDOW_MS.week, 0)).toBe(50)
    expect(evenPace(null, WINDOW_MS.fiveHour, 0)).toBe(null)
    expect(evenPace(new Date(0).toISOString(), WINDOW_MS.fiveHour, MIN)).toBe(null)
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

  test('pace: the share used over the share of the window gone; null at its very start or with no reset time', () => {
    // Two of five hours left: 60% gone.
    expect(paceOf(45, new Date(2 * HOUR).toISOString(), WINDOW_MS.fiveHour, 0)).toBe(75)
    expect(paceOf(18, new Date(48 * HOUR).toISOString(), WINDOW_MS.week, 0)).toBe(25)
    // A minute in, 3% used: shown, however high.
    expect(paceOf(3, new Date(5 * HOUR - MIN).toISOString(), WINDOW_MS.fiveHour, 0)).toBe(900)
    expect(paceOf(0, new Date(5 * HOUR).toISOString(), WINDOW_MS.fiveHour, 0)).toBe(null)
    expect(paceOf(10, null, WINDOW_MS.fiveHour, 0)).toBe(null)
    expect(paceLevel(80)).toBe('success')
    expect(paceLevel(81)).toBe('warning')
    expect(paceLevel(100)).toBe('warning')
    expect(paceLevel(101)).toBe('error')
  })

  test('the day’s start: kept through the day; a new day carried on from the last reading is exact, one past it is a gap', () => {
    const wed = new Date(2026, 9, 7).getTime()
    const reset = new Date(wed + 5 * DAY).toISOString()
    // Nothing before it: the first day, a gap.
    const first = nextDayStart(null, 20, reset, wed + 9 * HOUR)
    expect(first).toMatchObject({ start: { used: 20, lastUsed: 20 }, isGap: true })
    const later = nextDayStart(first.start, 30, reset, wed + 20 * HOUR)
    expect(later).toMatchObject({ start: { used: 20, lastUsed: 30 }, isGap: false })
    expect(nextDayStart(later.start, 30, reset, wed + 20 * HOUR).start).toBe(later.start)
    // The next day, at the reading last seen: nothing went unseen.
    expect(nextDayStart(later.start, 30, reset, wed + DAY + HOUR)).toMatchObject({ start: { used: 30 }, isGap: false })
    // Past it: use no reading saw, some of it perhaps today's.
    expect(nextDayStart(later.start, 34, reset, wed + DAY + HOUR)).toMatchObject({ start: { used: 34 }, isGap: true })
    // A new week, or a fall in use.
    expect(nextDayStart(later.start, 30, new Date(wed + 12 * DAY).toISOString(), wed + 20 * HOUR).isGap).toBe(true)
    expect(nextDayStart(later.start, 2, reset, wed + 20 * HOUR)).toMatchObject({ start: { used: 2 }, isGap: true })
  })

  test('a kept day start: read whole, and one with no last reading (the first version’s) read as none', () => {
    const resetsAt = '2026-10-10T01:00:00.000Z'
    expect(dayStartOf({ day: '2026-10-08', used: 73, lastUsed: 74, resetsAt })).toEqual({ day: '2026-10-08', used: 73, lastUsed: 74, resetsAt })
    expect(dayStartOf({ day: '2026-10-08', used: 60, lastUsed: 74, resetsAt, isEstimated: true })?.isEstimated).toBe(true)
    expect(dayStartOf({ day: '2026-10-08', used: 73, resetsAt })).toBe(null)
    expect(dayStartOf(null)).toBe(null)
    expect(dayStartOf('2026-10-08')).toBe(null)
  })

  test('days left count today and the reset’s own day; the budget splits what was left at the day’s start', () => {
    const wed = new Date(2026, 9, 7).getTime()
    const at = wed + 10 * HOUR
    expect(daysLeft(new Date(wed + 5 * DAY + 9 * HOUR).toISOString(), at)).toBe(6)
    expect(daysLeft(new Date(wed + 2 * DAY).toISOString(), at)).toBe(2)
    expect(daysLeft(new Date(wed + 11 * HOUR).toISOString(), at)).toBe(1)
    const start = { day: '2026-10-07', used: 20, lastUsed: 20, resetsAt: new Date(wed + 4 * DAY).toISOString() }
    const b = weekBudget(start, 30, start.resetsAt, at)
    expect(b).toMatchObject({ budget: 20, today: 10, mark: 40, daysLeft: 4 })
    expect(Math.round((b?.tomorrow ?? 0) * 100)).toBe(2333)
    expect(weekBudget(start, 30, null, at)).toBe(null)
  })

  test('the week’s head: today against its budget, tomorrow once past it, what is left once a day’s share is under 1%', () => {
    expect(budgetLevel(12, 16)).toBe('success')
    expect(budgetLevel(13, 16)).toBe('warning')
    expect(budgetLevel(17, 16)).toBe('error')
    const text = (h: ReturnType<typeof weekHead>) => h.map(x => x.text).join(' · ')
    expect(text(weekHead({ today: 9, budget: 16.4, tomorrow: 14, daysLeft: 5, mark: 30 }, 26))).toBe('today 9% of 16%')
    expect(text(weekHead({ today: 21, budget: 16.4, tomorrow: 12.6, daysLeft: 5, mark: 30 }, 38))).toBe('today 21% of 16% · tomorrow 13%')
    // The last day: past it, there is no tomorrow to name.
    expect(text(weekHead({ today: 21, budget: 16, tomorrow: null, daysLeft: 1, mark: 30 }, 38))).toBe('today 21% of 16%')
    expect(text(weekHead({ today: 0, budget: 0.4, tomorrow: 0.4, daysLeft: 5, mark: 99 }, 98))).toBe('2% left for 5d')
    expect(text(weekHead({ today: 12, budget: 16.4, tomorrow: 14, daysLeft: 5, mark: 30 }, 26, true))).toBe('today ~12% of 16%')
    expect(text(weekHead({ today: 3, budget: 2, tomorrow: null, daysLeft: 1, mark: 100 }, 100))).toBe('')
  })

  test('effort from settings: per model first, then the global level', () => {
    const settings = { effortLevel: 'low', modelSettings: { 'claude-opus-5-5': { effortLevel: 'medium' } } }
    expect(effortFromSettings(settings, 'claude-opus-5-5')).toBe('medium')
    expect(effortFromSettings(settings, 'claude-opus-5-5[1m]')).toBe('medium')
    expect(effortFromSettings(settings, 'claude-sonnet-5-5')).toBe('low')
    expect(effortFromSettings({}, 'claude-opus-5-5')).toBe(null)
  })

  test('ccusage output', () => {
    expect(parseBurn(blocksJson(83.67))).toBe(83.67)
    expect(parseBurn(JSON.stringify({ blocks: [] }))).toBe(null)
    expect(parseToday(dailyJson(59.4))).toBe(59.4)
    expect(parseToday(JSON.stringify({ daily: [] }))).toBe(null)
    expect(sinceArg(Date.parse('2026-10-07T03:00:00Z'))).toBe('20261006')
  })
})
