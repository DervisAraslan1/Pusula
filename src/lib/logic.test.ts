import { describe, expect, it } from 'vitest'
import { addDays, startOfWeek, toKey, weekdayIndex } from './date'
import { parseQuickAdd } from './parse'
import { buildDemoTasks } from './seed'
import { currentStreak, longestStreak } from './stats'
import { buildSuggestions, findFreeSlot } from './suggest'
import { normalizeTheme, THEMES } from './themes'
import type { Task } from './types'

const TODAY = '2026-11-06' // A Friday.

const task = (partial: Partial<Task>): Task => ({
  id: crypto.randomUUID(),
  title: 'Görev',
  date: TODAY,
  duration: 30,
  category: 'is',
  priority: 'normal',
  done: false,
  postponed: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...partial,
})

const doneOn = (date: string, title: string, time = '10:00') =>
  task({ title, date, time, done: true, completedAt: new Date(`${date}T${time}:00`).toISOString() })

describe('date helpers', () => {
  it('keeps local days across UTC boundaries', () => {
    expect(toKey(new Date(2026, 10, 6, 0, 30))).toBe('2026-11-06')
    expect(toKey(new Date(2026, 10, 6, 23, 30))).toBe('2026-11-06')
  })

  it('crosses month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('treats Monday as the first weekday', () => {
    expect(weekdayIndex('2026-11-02')).toBe(0)
    expect(weekdayIndex('2026-11-08')).toBe(6)
    expect(startOfWeek(TODAY)).toBe('2026-11-02')
  })
})

describe('parseQuickAdd', () => {
  it('reads date, time, duration and priority', () => {
    expect(parseQuickAdd('Yarın 14:30 müşteri görüşmesi 45dk !', TODAY)).toMatchObject({
      title: 'müşteri görüşmesi',
      date: '2026-11-07',
      time: '14:30',
      duration: 45,
      priority: 'high',
      category: 'is',
    })
  })

  it('tells "1 saat" (length) from "saat 9" (clock)', () => {
    const parsed = parseQuickAdd('saat 9 yoga 1 saat', TODAY)
    expect(parsed).toMatchObject({ title: 'yoga', time: '09:00', duration: 60, category: 'saglik' })
  })

  it('accepts decimal hours', () => {
    expect(parseQuickAdd('rapor 1,5 saat', TODAY).duration).toBe(90)
  })

  it('does not confuse cuma with cumartesi or pazar with pazartesi', () => {
    expect(parseQuickAdd('cumartesi kahvaltı', TODAY).date).toBe('2026-11-07')
    expect(parseQuickAdd('pazartesi toplantı', TODAY).date).toBe('2026-11-09')
    expect(parseQuickAdd('pazar kahvaltı', TODAY).date).toBe('2026-11-08')
  })

  it('moves a same-named weekday to next week', () => {
    expect(parseQuickAdd('cuma rapor', TODAY).date).toBe('2026-11-13')
  })

  it('lowercases Turkish capitals correctly', () => {
    expect(parseQuickAdd('YARIN sınav', TODAY).date).toBe('2026-11-07')
  })

  it('leaves weekday-like words inside other words alone', () => {
    expect(parseQuickAdd('pazarlama planı', TODAY)).toMatchObject({ title: 'pazarlama planı', date: TODAY })
  })

  it('prefers the category used before for the same title', () => {
    const history = [task({ title: 'Sunum', category: 'ogrenme' })]
    expect(parseQuickAdd('sunum', TODAY, history).category).toBe('ogrenme')
  })

  it('applies category tags', () => {
    expect(parseQuickAdd('koşu #ev', TODAY)).toMatchObject({ title: 'koşu', category: 'ev' })
  })
})

describe('normalizeTheme', () => {
  it('keeps every known theme', () => {
    for (const { id } of THEMES) expect(normalizeTheme(id)).toBe(id)
  })

  it('migrates the old dark and light values', () => {
    expect(normalizeTheme('dark')).toBe('lacivert')
    expect(normalizeTheme('light')).toBe('buz')
  })

  it('falls back for unknown values', () => {
    expect(normalizeTheme(undefined)).toBe('lacivert')
    expect(normalizeTheme('gökkuşağı')).toBe('lacivert')
  })
})

describe('streaks', () => {
  it('survives an empty today but breaks on a missed day', () => {
    const tasks = [doneOn(addDays(TODAY, -1), 'a'), doneOn(addDays(TODAY, -2), 'b'), doneOn(addDays(TODAY, -4), 'c')]
    expect(currentStreak(tasks, TODAY)).toBe(2)
    expect(longestStreak(tasks)).toBe(2)
  })
})

describe('findFreeSlot', () => {
  it('skips booked time', () => {
    const tasks = [task({ time: '09:00', duration: 60 })]
    expect(findFreeSlot(tasks, 30, 9 * 60, 12 * 60)).toBe(10 * 60)
  })

  it('returns undefined when nothing fits', () => {
    const tasks = [task({ time: '09:00', duration: 180 })]
    expect(findFreeSlot(tasks, 30, 9 * 60, 12 * 60)).toBeUndefined()
  })
})

describe('buildSuggestions', () => {
  const now = new Date(2026, 10, 6, 9, 0)
  const fridays = [7, 14, 21, 28].map((days) => addDays(TODAY, -days))

  it('offers overdue tasks with every id', () => {
    const late = task({ title: 'Eski', date: addDays(TODAY, -1) })
    const [first] = buildSuggestions([late], now)
    expect(first.kind).toBe('overdue')
    expect(first.action).toEqual({ type: 'move', ids: [late.id], date: TODAY })
  })

  it('finds weekday patterns with the usual time', () => {
    const history = fridays.map((date) => doneOn(date, 'Koşu', '18:30'))
    const found = buildSuggestions(history, now).find((s) => s.kind === 'recurring')
    expect(found?.action).toMatchObject({ type: 'add', draft: { title: 'Koşu', time: '18:30' } })
  })

  it('stays quiet about a pattern already planned today', () => {
    const history = [...fridays.map((date) => doneOn(date, 'Koşu')), task({ title: 'koşu' })]
    expect(buildSuggestions(history, now).some((s) => s.kind === 'recurring')).toBe(false)
  })

  it('does not re-suggest a pattern that is still open from yesterday', () => {
    const history = [...fridays.map((date) => doneOn(date, 'Koşu')), task({ title: 'Koşu', date: addDays(TODAY, -1) })]
    expect(buildSuggestions(history, now).some((s) => s.kind === 'recurring')).toBe(false)
  })

  it('drops a usual time that has already passed today', () => {
    const history = fridays.map((date) => doneOn(date, 'Koşu', '07:30'))
    const found = buildSuggestions(history, new Date(2026, 10, 6, 20, 0)).find((s) => s.kind === 'recurring')
    expect(found?.action).toMatchObject({ type: 'add', draft: { time: undefined } })
  })

  it('needs at least three occurrences', () => {
    const history = fridays.slice(0, 2).map((date) => doneOn(date, 'Koşu'))
    expect(buildSuggestions(history, now)).toEqual([])
  })

  it('hides a dismissed suggestion until its snooze ends', () => {
    const late = task({ date: addDays(TODAY, -1) })
    const key = buildSuggestions([late], now)[0].key
    expect(buildSuggestions([late], now, {}, { [key]: addDays(TODAY, 1) })).toEqual([])
    expect(buildSuggestions([late], now, {}, { [key]: TODAY })).toHaveLength(1)
  })

  it('ranks a kind lower after it keeps being rejected', () => {
    const tasks = [task({ title: 'Eski', date: addDays(TODAY, -1) }), task({ title: 'Zor', postponed: 3 })]
    expect(buildSuggestions(tasks, now)[0].kind).toBe('overdue')
    const rejected = buildSuggestions(tasks, now, { overdue: { accepted: 0, dismissed: 20 } })
    expect(rejected[0].kind).toBe('postponed')
  })

  it('warns when today exceeds the usual load', () => {
    const history = Array.from({ length: 10 }, (_, i) => doneOn(addDays(TODAY, -i - 1), `Görev ${i}`))
    const plan = Array.from({ length: 5 }, (_, i) => task({ title: `Plan ${i}` }))
    expect(buildSuggestions([...history, ...plan], now).some((s) => s.kind === 'overload')).toBe(true)
  })

  it('never emits two suggestions that add the same task', () => {
    const history = Array.from({ length: 30 }, (_, i) => doneOn(addDays(TODAY, -i - 1), 'Kitap oku', '22:00'))
    const adds = buildSuggestions(history, now).filter((s) => s.action.type === 'add')
    expect(adds).toHaveLength(1)
  })

  it('produces varied suggestions from the demo data', () => {
    const kinds = new Set(buildSuggestions(buildDemoTasks(TODAY), now).map((s) => s.kind))
    expect(kinds.size).toBeGreaterThanOrEqual(3)
  })
})
