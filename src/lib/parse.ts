import { addDays, weekdayIndex } from './date'
import type { CategoryId, Priority, Task } from './types'

export interface ParsedTask {
  title: string
  date: string
  time?: string
  duration: number
  category: CategoryId
  priority: Priority
}

export const normalizeTitle = (title: string) =>
  title.toLocaleLowerCase('tr').trim().replace(/\s+/g, ' ')

const CATEGORY_TAGS: Record<string, CategoryId> = {
  iş: 'is',
  is: 'is',
  kişisel: 'kisisel',
  kisisel: 'kisisel',
  sağlık: 'saglik',
  saglik: 'saglik',
  spor: 'saglik',
  öğrenme: 'ogrenme',
  ogrenme: 'ogrenme',
  ev: 'ev',
}

const KEYWORDS: [RegExp, CategoryId][] = [
  [/toplantı|rapor|sunum|müşteri|mail|e-posta|proje|sprint|teklif|fatura|görüşme/, 'is'],
  [/spor|koşu|yürüyüş|antrenman|yoga|doktor|diş|ilaç|gym|pilates|meditasyon/, 'saglik'],
  [/kitap|kurs|ders|ingilizce|çalış|oku|öğren|sınav|makale|pratik/, 'ogrenme'],
  [/temizlik|market|çamaşır|bulaşık|yemek|tamir|alışveriş|fatura öde|kira/, 'ev'],
]

const WEEKDAY_TOKENS = ['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar']

// JS \b treats Turkish letters as non-word characters, so token edges are
// matched explicitly against whitespace.
const token = (body: string, flags = 'u') => new RegExp(`(?:^|\\s)(?:${body})(?=\\s|$)`, flags)

/** Chooses a category from the user's own history first, then from keywords. */
export function guessCategory(title: string, history: Task[]): CategoryId {
  const norm = normalizeTitle(title)
  const previous = history.findLast((t) => normalizeTitle(t.title) === norm)
  if (previous) return previous.category
  return KEYWORDS.find(([pattern]) => pattern.test(norm))?.[1] ?? 'kisisel'
}

export function parseQuickAdd(input: string, today: string, history: Task[] = []): ParsedTask {
  let text = ` ${input.trim()} `
  const lower = () => text.toLocaleLowerCase('tr')
  const cut = (match: RegExpExecArray) => {
    // The lowercase form can differ in length only for rare characters, and
    // Turkish locale mapping is 1:1, so indices stay valid against `text`.
    text = text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length)
  }

  let date = today
  let time: string | undefined
  let duration = 30
  let priority: Priority = 'normal'
  let category: CategoryId | undefined

  const tag = /(?:^|\s)#([\p{L}]+)(?=\s|$)/u.exec(lower())
  if (tag && CATEGORY_TAGS[tag[1]]) {
    category = CATEGORY_TAGS[tag[1]]
    cut(tag)
  }

  const bang = token('!+').exec(lower())
  if (bang) {
    priority = 'high'
    cut(bang)
  }

  const length = token('(\\d+(?:[.,]\\d+)?)\\s*(dk|dakika|sa|saat)').exec(lower())
  if (length) {
    const amount = Number(length[1].replace(',', '.'))
    const minutes = length[2].startsWith('d') ? amount : amount * 60
    if (minutes > 0 && minutes <= 720) duration = Math.round(minutes)
    cut(length)
  }

  const clock =
    token('(?:saat\\s+)?([01]?\\d|2[0-3])[:.]([0-5]\\d)(?:\\s*\'?(?:de|da|te|ta))?').exec(lower()) ??
    token('saat\\s+([01]?\\d|2[0-3])').exec(lower())
  if (clock) {
    time = `${clock[1].padStart(2, '0')}:${clock[2] ?? '00'}`
    cut(clock)
  }

  const relative = token('bugün|yarın|öbür gün|yarından sonra').exec(lower())
  if (relative) {
    const word = relative[0].trim()
    date = addDays(today, word === 'bugün' ? 0 : word === 'yarın' ? 1 : 2)
    cut(relative)
  } else {
    const weekday = token(`(${WEEKDAY_TOKENS.join('|')})(?:\\s+günü)?`).exec(lower())
    if (weekday) {
      const target = WEEKDAY_TOKENS.indexOf(weekday[1])
      const distance = (target - weekdayIndex(today) + 7) % 7 || 7
      date = addDays(today, distance)
      cut(weekday)
    }
  }

  const title = text.trim().replace(/\s+/g, ' ')
  return {
    title,
    date,
    time,
    duration,
    priority,
    category: category ?? guessCategory(title, history),
  }
}
