import {
  addDays,
  fromMinutes,
  minutesOfDay,
  toKey,
  toMinutes,
  WEEKDAYS,
  weekdayIndex,
} from './date'
import { normalizeTitle } from './parse'
import { currentStreak } from './stats'
import type { CategoryId, Feedback, Suggestion, SuggestionKind, Task } from './types'
import { categoryLabel } from './types'

const MAX_VISIBLE = 4

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const groupBy = <T,>(items: T[], key: (item: T) => string) => {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    groups.set(k, [...(groups.get(k) ?? []), item])
  }
  return groups
}

const roundToQuarter = (minutes: number) => Math.round(minutes / 15) * 15

/** First gap of `duration` minutes in [start, end) that no timed task occupies. */
export function findFreeSlot(tasks: Task[], duration: number, start: number, end: number) {
  const busy = tasks
    .filter((t) => t.time)
    .map((t) => [toMinutes(t.time!), toMinutes(t.time!) + t.duration] as const)
  const first = Math.ceil(start / 15) * 15
  for (let at = first; at + duration <= end; at += 15) {
    if (!busy.some(([from, to]) => at < to && at + duration > from)) return at
  }
  return undefined
}

interface Context {
  tasks: Task[]
  now: Date
  today: string
  minute: number
  todays: Task[]
  plannedToday: Set<string>
  completedOn: (task: Task) => string | undefined
}

type Rule = (ctx: Context) => Suggestion[]

const overdue: Rule = ({ tasks, today }) => {
  const earliest = addDays(today, -14)
  const late = tasks.filter((t) => !t.done && t.date < today && t.date >= earliest)
  if (!late.length) return []
  const first = late[0].title
  return [
    {
      key: `overdue:${today}`,
      kind: 'overdue',
      title:
        late.length === 1 ? `“${first}” bugüne taşınsın mı?` : `${late.length} görev bugüne taşınsın mı?`,
      reason:
        late.length === 1
          ? 'Önceki günden tamamlanmadan kaldı.'
          : `“${first}” ve ${late.length - 1} görev daha önceki günlerden kaldı.`,
      actionLabel: 'Bugüne taşı',
      action: { type: 'move', ids: late.map((t) => t.id), date: today },
      score: 90,
      snoozeDays: 1,
    },
  ]
}

const recurring: Rule = ({ tasks, today, minute, plannedToday }) => {
  const WEEKS = 6
  const pastDays = new Set(Array.from({ length: WEEKS }, (_, i) => addDays(today, -7 * (i + 1))))
  const samples = tasks.filter((t) => t.done && pastDays.has(t.date))
  const dayName = WEEKDAYS[weekdayIndex(today)]

  return [...groupBy(samples, (t) => normalizeTitle(t.title))].flatMap(([norm, group]) => {
    const weeks = new Set(group.map((t) => t.date)).size
    if (weeks < 3 || plannedToday.has(norm)) return []
    const latest = group.reduce((a, b) => (a.date > b.date ? a : b))
    const times = group.filter((t) => t.time).map((t) => toMinutes(t.time!))
    const usual = times.length ? fromMinutes(roundToQuarter(median(times))) : undefined
    // Never propose a slot that has already passed today.
    const slot = usual && toMinutes(usual) >= minute ? usual : undefined
    return [
      {
        key: `recurring:${norm}:${today}`,
        kind: 'recurring' as const,
        title: `“${latest.title}” ekle${slot ? `, ${slot}` : ''}`,
        reason: `Son ${WEEKS} haftada ${weeks} kez ${dayName} günü yaptın${usual ? `, genelde ${usual} civarı` : ''}.`,
        actionLabel: 'Plana ekle',
        action: {
          type: 'add' as const,
          draft: {
            title: latest.title,
            date: today,
            time: slot,
            duration: median(group.map((t) => t.duration)),
            category: latest.category,
            priority: latest.priority,
          },
        },
        score: 60 + weeks * 4,
        snoozeDays: 1,
      },
    ]
  })
}

const habit: Rule = ({ tasks, today, minute, plannedToday, completedOn }) => {
  const WINDOW = 14
  const earliest = addDays(today, -WINDOW)
  const recent = tasks.filter((t) => {
    const day = completedOn(t)
    return day !== undefined && day >= earliest && day < today
  })
  return [...groupBy(recent, (t) => normalizeTitle(t.title))].flatMap(([norm, group]) => {
    const days = new Set(group.map(completedOn)).size
    if (days < 7 || plannedToday.has(norm)) return []
    const latest = group.reduce((a, b) => (a.date > b.date ? a : b))
    const times = group.filter((t) => t.time).map((t) => toMinutes(t.time!))
    const usual = times.length ? fromMinutes(roundToQuarter(median(times))) : undefined
    // Never propose a slot that has already passed today.
    const slot = usual && toMinutes(usual) >= minute ? usual : undefined
    return [
      {
        key: `habit:${norm}:${today}`,
        kind: 'habit' as const,
        title: `“${latest.title}” bugün de olsun mu?`,
        reason: `Son ${WINDOW} günde ${days} kez yaptın. Bugün için henüz planlı değil.`,
        actionLabel: 'Plana ekle',
        action: {
          type: 'add' as const,
          draft: {
            title: latest.title,
            date: today,
            time: slot,
            duration: median(group.map((t) => t.duration)),
            category: latest.category,
            priority: 'normal' as const,
          },
        },
        score: 45 + days * 2,
        snoozeDays: 1,
      },
    ]
  })
}

const peak: Rule = ({ tasks, today, minute, todays }) => {
  const BUCKET = 120
  const MIN_SAMPLES = 6
  const earliest = addDays(today, -56)
  const past = tasks.filter((t) => t.time && t.date < today && t.date >= earliest)
  const loose = todays.filter((t) => !t.done && !t.time).slice(0, 2)

  return loose.flatMap((task) => {
    const buckets = [
      ...groupBy(
        past.filter((t) => t.category === task.category),
        (t) => String(Math.floor(toMinutes(t.time!) / BUCKET)),
      ),
    ]
      .map(([bucket, group]) => ({
        start: Number(bucket) * BUCKET,
        rate: group.filter((t) => t.done).length / group.length,
        samples: group.length,
      }))
      .filter((b) => b.samples >= MIN_SAMPLES && b.rate >= 0.6 && b.start + BUCKET > minute)
      .sort((a, b) => b.rate - a.rate)

    for (const bucket of buckets) {
      const slot = findFreeSlot(
        todays,
        task.duration,
        Math.max(bucket.start, minute),
        bucket.start + BUCKET + task.duration,
      )
      if (slot === undefined) continue
      const range = `${fromMinutes(bucket.start)}–${fromMinutes(bucket.start + BUCKET)}`
      return [
        {
          key: `peak:${task.id}:${today}`,
          kind: 'peak' as const,
          title: `“${task.title}” için ${fromMinutes(slot)} uygun`,
          reason: `${categoryLabel(task.category)} görevlerinde ${range} arası başarın %${Math.round(bucket.rate * 100)} (${bucket.samples} görev).`,
          actionLabel: `Saati ${fromMinutes(slot)} yap`,
          action: { type: 'schedule' as const, id: task.id, time: fromMinutes(slot) },
          score: 55 + bucket.rate * 20,
          snoozeDays: 1,
        },
      ]
    }
    return []
  })
}

const overload: Rule = ({ tasks, today, todays, completedOn }) => {
  const earliest = addDays(today, -28)
  const perDay = new Map<string, number>()
  for (const task of tasks) {
    const day = completedOn(task)
    if (day && day >= earliest && day < today) perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }
  if (perDay.size < 7) return []
  const average = [...perDay.values()].reduce((a, b) => a + b, 0) / perDay.size
  const open = todays.filter((t) => !t.done)
  if (todays.length <= average * 1.3 || todays.length <= average + 1.5 || !open.length) return []

  const candidate = [...open].sort(
    (a, b) =>
      Number(a.priority === 'high') - Number(b.priority === 'high') ||
      (b.time ?? '99').localeCompare(a.time ?? '99'),
  )[0]
  return [
    {
      key: `overload:${today}`,
      kind: 'overload',
      title: 'Bugün ortalamanın üzerindesin',
      reason: `Günde ortalama ${average.toFixed(1).replace('.', ',')} görev bitiriyorsun, bugün ${todays.length} planlı. “${candidate.title}” yarına kalabilir.`,
      actionLabel: 'Yarına al',
      action: { type: 'move', ids: [candidate.id], date: addDays(today, 1) },
      score: 75,
      snoozeDays: 1,
    },
  ]
}

const postponed: Rule = ({ tasks, today, minute, todays }) =>
  tasks
    .filter((t) => !t.done && t.postponed >= 3 && t.date <= today)
    .map((task) => {
      const slot = findFreeSlot(todays, 15, Math.max(minute, 9 * 60), 23 * 60)
      return {
        key: `postponed:${task.id}`,
        kind: 'postponed' as const,
        title: `“${task.title}” küçültülsün mü?`,
        reason: `${task.postponed} kez ertelendi. Tamamını değil, sadece ilk 15 dakikasını planla.`,
        actionLabel: 'İlk 15 dakikaya indir',
        action: {
          type: 'shrink' as const,
          id: task.id,
          minutes: 15,
          time: slot === undefined ? undefined : fromMinutes(slot),
        },
        score: 80 + task.postponed,
        snoozeDays: 3,
      }
    })

const estimate: Rule = ({ tasks, today, todays }) => {
  const measured = tasks.filter(
    (t) => t.done && t.actualMinutes && t.date >= addDays(today, -56) && t.date < today,
  )
  return [...groupBy(measured, (t) => t.category)].flatMap(([id, group]) => {
    const category = id as CategoryId
    if (group.length < 5) return []
    const planned = group.reduce((sum, t) => sum + t.duration, 0)
    const actual = group.reduce((sum, t) => sum + (t.actualMinutes ?? 0), 0)
    const ratio = actual / planned
    const affected = todays.filter((t) => !t.done && t.category === category)
    if (ratio < 1.2 || !affected.length) return []
    return [
      {
        key: `estimate:${category}:${today}`,
        kind: 'estimate' as const,
        title: `${categoryLabel(category)} sürelerini gerçeğe yaklaştır`,
        reason: `Odak kayıtlarına göre bu görevler planladığından %${Math.round((ratio - 1) * 100)} uzun sürüyor (${group.length} ölçüm).`,
        actionLabel: `${affected.length} görevi güncelle`,
        action: { type: 'scale' as const, ids: affected.map((t) => t.id), factor: ratio },
        score: 50 + (ratio - 1) * 40,
        snoozeDays: 7,
      },
    ]
  })
}

const neglected: Rule = ({ tasks, today, todays, completedOn }) => {
  const earliest = addDays(today, -56)
  const week = addDays(today, -7)
  const done = tasks.filter((t) => {
    const day = completedOn(t)
    return day !== undefined && day >= earliest && day < today
  })
  if (done.length < 20) return []

  return [...groupBy(done, (t) => t.category)].flatMap(([id, group]) => {
    const category = id as CategoryId
    const share = group.length / done.length
    const lastDone = group.map((t) => completedOn(t)!).sort().at(-1)!
    if (share < 0.08 || lastDone >= week || todays.some((t) => t.category === category)) return []
    const byTitle = [...groupBy(group, (t) => normalizeTitle(t.title)).values()]
    const favourite = byTitle.sort((a, b) => b.length - a.length)[0].at(-1)!
    return [
      {
        key: `neglected:${category}`,
        kind: 'neglected' as const,
        title: `${categoryLabel(category)} tarafı biraz geride kaldı`,
        reason: `Normalde tamamladıklarının payı %${Math.round(share * 100)}, ama 7 gündür bu alanda hiçbir şey bitmedi. “${favourite.title}” iyi bir başlangıç olabilir.`,
        actionLabel: 'Bugüne ekle',
        action: {
          type: 'add' as const,
          draft: {
            title: favourite.title,
            date: today,
            duration: favourite.duration,
            category,
            priority: 'normal' as const,
          },
        },
        score: 58,
        snoozeDays: 3,
      },
    ]
  })
}

const streak: Rule = ({ tasks, today, now, todays }) => {
  const length = currentStreak(tasks, today)
  if (now.getHours() < 18 || length < 3 || todays.some((t) => t.done)) return []
  return [
    {
      key: `streak:${today}`,
      kind: 'streak',
      title: `${length} günlük serin devam etsin`,
      reason: 'Bugün henüz bir görev tamamlamadın. Küçük bir tanesi seriyi korumaya yeter.',
      action: { type: 'none' },
      score: 70,
      snoozeDays: 1,
    },
  ]
}

const RULES: Rule[] = [overdue, postponed, overload, recurring, peak, neglected, habit, estimate, streak]

/** 0.5 for a kind the user always rejects, 1.5 for one they always accept. */
const feedbackWeight = (kind: SuggestionKind, feedback: Feedback) => {
  const { accepted = 0, dismissed = 0 } = feedback[kind] ?? {}
  return 0.5 + (accepted + 1) / (accepted + dismissed + 2)
}

export function buildSuggestions(
  tasks: Task[],
  now: Date,
  feedback: Feedback = {},
  dismissed: Record<string, string> = {},
): Suggestion[] {
  const today = toKey(now)
  const todays = tasks.filter((t) => t.date === today)
  const ctx: Context = {
    tasks,
    now,
    today,
    minute: minutesOfDay(now),
    todays,
    plannedToday: new Set(
      tasks
        .filter((t) => t.date === today || (!t.done && t.date < today && t.date >= addDays(today, -14)))
        .map((t) => normalizeTitle(t.title)),
    ),
    completedOn: (t) => (t.done && t.completedAt ? toKey(new Date(t.completedAt)) : undefined),
  }

  const seen = new Set<string>()
  return RULES.flatMap((rule) => rule(ctx))
    .filter((s) => !(dismissed[s.key] && dismissed[s.key] > today))
    .map((s) => ({ ...s, score: s.score * feedbackWeight(s.kind, feedback) }))
    .sort((a, b) => b.score - a.score)
    .filter((s) => {
      // A task that is both a weekly and a daily pattern should appear once.
      const target = s.action.type === 'add' ? normalizeTitle(s.action.draft.title) : s.key
      if (seen.has(target)) return false
      seen.add(target)
      return true
    })
    .slice(0, MAX_VISIBLE)
}
