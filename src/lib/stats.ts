import { addDays, startOfWeek, toKey, weekdayIndex } from './date'
import type { CategoryId, Task } from './types'
import { CATEGORIES } from './types'

const completedDay = (t: Task) => (t.done && t.completedAt ? toKey(new Date(t.completedAt)) : undefined)

/** Consecutive days with a completion. An empty today does not break the run. */
export function currentStreak(tasks: Task[], today: string) {
  const active = new Set(tasks.map(completedDay))
  let day = active.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (active.has(day)) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}

export function longestStreak(tasks: Task[]) {
  const days = [...new Set(tasks.map(completedDay).filter(Boolean) as string[])].sort()
  let best = 0
  let run = 0
  days.forEach((day, i) => {
    run = i > 0 && addDays(days[i - 1], 1) === day ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

/** Full Monday-first weeks ending with the current one; future days are null. */
export function calendarGrid(tasks: Task[], today: string, weeks = 12) {
  const counts = new Map<string, number>()
  for (const task of tasks) {
    const day = completedDay(task)
    if (day) counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  const first = addDays(startOfWeek(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(first, w * 7 + d)
      return { date, count: date > today ? null : (counts.get(date) ?? 0) }
    }),
  )
}

export const HOUR_BLOCKS = [
  { start: 6, label: '06–09' },
  { start: 9, label: '09–12' },
  { start: 12, label: '12–15' },
  { start: 15, label: '15–18' },
  { start: 18, label: '18–21' },
  { start: 21, label: '21–24' },
]

/** matrix[weekday][block] = completions in the last 8 weeks. */
export function productivityMatrix(tasks: Task[], today: string) {
  const earliest = addDays(today, -56)
  const matrix = Array.from({ length: 7 }, () => HOUR_BLOCKS.map(() => 0))
  for (const task of tasks) {
    const day = completedDay(task)
    if (!day || day < earliest || day > today) continue
    const hour = new Date(task.completedAt!).getHours()
    const block = Math.floor((hour - 6) / 3)
    if (block >= 0 && block < HOUR_BLOCKS.length) matrix[weekdayIndex(day)][block] += 1
  }
  return matrix
}

export function categoryBreakdown(tasks: Task[], today: string) {
  const earliest = addDays(today, -28)
  const counts = new Map<CategoryId, number>()
  for (const task of tasks) {
    const day = completedDay(task)
    if (day && day >= earliest && day <= today) {
      counts.set(task.category, (counts.get(task.category) ?? 0) + 1)
    }
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  return CATEGORIES.map((c) => ({
    ...c,
    count: counts.get(c.id) ?? 0,
    share: total ? (counts.get(c.id) ?? 0) / total : 0,
  })).sort((a, b) => b.count - a.count)
}

export function summary(tasks: Task[], today: string) {
  const windowStats = (from: string, to: string) => {
    const planned = tasks.filter((t) => t.date >= from && t.date <= to)
    const done = planned.filter((t) => t.done)
    return {
      planned: planned.length,
      done: done.length,
      rate: planned.length ? done.length / planned.length : null,
    }
  }
  const yesterday = addDays(today, -1)
  const current = windowStats(addDays(today, -28), yesterday)
  const previous = windowStats(addDays(today, -56), addDays(today, -29))
  const activeDays = new Set(
    tasks.map(completedDay).filter((d) => d && d >= addDays(today, -28) && d <= yesterday),
  ).size
  const focusMinutes = tasks
    .filter((t) => t.date >= addDays(today, -28))
    .reduce((sum, t) => sum + (t.actualMinutes ?? 0), 0)

  return {
    rate: current.rate,
    rateDelta:
      current.rate !== null && previous.rate !== null ? current.rate - previous.rate : null,
    averagePerDay: activeDays ? current.done / activeDays : 0,
    focusMinutes,
    streak: currentStreak(tasks, today),
    longest: longestStreak(tasks),
  }
}
