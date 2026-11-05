import { addDays, fromKey, fromMinutes, toMinutes, weekdayIndex } from './date'
import type { CategoryId, Task } from './types'

interface Template {
  title: string
  category: CategoryId
  time?: string
  duration: number
  /** Monday = 0. Omitted means every day. */
  days?: number[]
  chance: number
  /** Chance of finishing the task once it is on the plan. */
  finish: number
}

const TEMPLATES: Template[] = [
  { title: 'Günlük ekip toplantısı', category: 'is', time: '10:00', duration: 15, days: [0, 1, 2, 3, 4], chance: 1, finish: 0.96 },
  { title: 'Derin çalışma bloğu', category: 'is', time: '10:30', duration: 90, days: [0, 1, 2, 3, 4], chance: 0.85, finish: 0.86 },
  { title: 'E-postaları temizle', category: 'is', time: '16:30', duration: 30, days: [0, 1, 2, 3, 4], chance: 0.6, finish: 0.55 },
  { title: 'Haftalık raporu hazırla', category: 'is', time: '14:00', duration: 60, days: [4], chance: 1, finish: 0.9 },
  { title: 'Sabah koşusu', category: 'saglik', time: '07:30', duration: 40, days: [0, 2, 4], chance: 0.95, finish: 0.88 },
  { title: 'Akşam yürüyüşü', category: 'saglik', time: '19:00', duration: 30, days: [1, 3], chance: 0.6, finish: 0.65 },
  { title: 'Kitap oku', category: 'ogrenme', time: '22:00', duration: 30, chance: 0.8, finish: 0.82 },
  { title: 'İngilizce pratiği', category: 'ogrenme', time: '21:00', duration: 25, days: [1, 3, 5], chance: 0.7, finish: 0.7 },
  { title: 'Aileyi ara', category: 'kisisel', time: '20:00', duration: 20, days: [6], chance: 0.9, finish: 0.9 },
  { title: 'Bütçeyi gözden geçir', category: 'kisisel', time: '11:00', duration: 30, days: [5], chance: 0.6, finish: 0.75 },
  { title: 'Market alışverişi', category: 'ev', time: '18:00', duration: 45, days: [5], chance: 0.9, finish: 0.9 },
  { title: 'Ev temizliği', category: 'ev', time: '12:00', duration: 60, days: [6], chance: 0.8, finish: 0.8 },
]

const REST_DAYS = [12, 13, 37, 38, 39, 66]

/** Small deterministic PRNG, so the sample history is stable for a given day. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildDemoTasks(today: string): Task[] {
  const random = mulberry32(20261106)
  const tasks: Task[] = []
  let serial = 0

  const base = (partial: Omit<Task, 'id' | 'createdAt' | 'postponed' | 'priority' | 'done'> & Partial<Task>): Task => ({
    id: `demo-${++serial}`,
    createdAt: fromKey(partial.date).toISOString(),
    postponed: 0,
    priority: 'normal',
    done: false,
    ...partial,
  })

  const completedAt = (date: string, time: string | undefined, duration: number) => {
    const at = fromKey(date)
    const minutes = (time ? toMinutes(time) : 15 * 60) + duration + Math.floor(random() * 25)
    at.setMinutes(Math.min(minutes, 23 * 60 + 55))
    return at.toISOString()
  }

  for (let offset = 84; offset >= 1; offset -= 1) {
    const date = addDays(today, -offset)
    const weekday = weekdayIndex(date)
    // Real history has gaps; a perfect record would make the streak meaningless.
    if (REST_DAYS.includes(offset)) continue
    for (const template of TEMPLATES) {
      if (template.days && !template.days.includes(weekday)) continue
      if (random() > template.chance) continue
      // The home category goes quiet recently so the "neglected" rule has evidence.
      if (template.category === 'ev' && offset <= 9) continue
      const done = offset > 1 ? random() < template.finish : false
      // Work tasks measured in focus mode run longer than planned.
      const measured = done && template.category === 'is' && random() < 0.45
      if (!done && offset <= 14 && offset > 1) continue
      if (offset === 1 && template.title !== 'E-postaları temizle') {
        tasks.push(
          base({
            title: template.title,
            date,
            time: template.time,
            duration: template.duration,
            category: template.category,
            done: true,
            completedAt: completedAt(date, template.time, template.duration),
          }),
        )
        continue
      }
      tasks.push(
        base({
          title: template.title,
          date,
          time: template.time,
          duration: template.duration,
          category: template.category,
          done,
          completedAt: done ? completedAt(date, template.time, template.duration) : undefined,
          actualMinutes: measured ? Math.round(template.duration * (1.2 + random() * 0.3)) : undefined,
        }),
      )
    }
  }

  const add = (partial: Parameters<typeof base>[0]) => tasks.push(base(partial))

  add({ title: 'Teklif dosyasını gözden geçir', date: addDays(today, -1), time: '17:00', duration: 45, category: 'is' })
  add({ title: 'Vergi evraklarını düzenle', date: today, duration: 120, category: 'kisisel', postponed: 4, priority: 'high' })
  add({ title: 'Müşteri sunumunu bitir', date: today, duration: 60, category: 'is', priority: 'high' })

  const weekday = weekdayIndex(today)
  const plan = TEMPLATES.filter(
    (t) => (!t.days || t.days.includes(weekday)) && t.category === 'is' && t.title !== 'E-postaları temizle',
  )
  for (const template of plan) {
    add({ title: template.title, date: today, time: template.time, duration: template.duration, category: template.category })
  }
  add({ title: 'Doktor randevusu', date: today, time: fromMinutes(15 * 60 + 30), duration: 45, category: 'saglik' })
  add({ title: 'Aylık hedefleri belirle', date: addDays(today, 1), time: '09:30', duration: 45, category: 'kisisel', priority: 'high' })
  add({ title: 'Proje planını paylaş', date: addDays(today, 2), time: '11:00', duration: 30, category: 'is' })
  add({ title: 'Diş kontrolü', date: addDays(today, 3), time: '16:00', duration: 40, category: 'saglik' })

  return tasks.sort((a, b) => a.date.localeCompare(b.date))
}
