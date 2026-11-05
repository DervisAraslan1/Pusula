// Every date in the app is a local calendar key. Never use toISOString() for
// these: it converts to UTC, which shifts the day for users in UTC+3.

const pad = (n: number) => String(n).padStart(2, '0')

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number)
  return toKey(new Date(y, m - 1, d + days))
}

/** Monday = 0 … Sunday = 6. */
export const weekdayIndex = (key: string) => (fromKey(key).getDay() + 6) % 7

export const startOfWeek = (key: string) => addDays(key, -weekdayIndex(key))

export const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const fromMinutes = (total: number) => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`

export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('tr-TR', options)
const longDate = fmt({ day: 'numeric', month: 'long', weekday: 'long' })
const shortDate = fmt({ day: 'numeric', month: 'short' })
const monthName = fmt({ month: 'short' })

export const formatLong = (key: string) => longDate.format(fromKey(key))
export const formatShort = (key: string) => shortDate.format(fromKey(key))
export const formatMonth = (key: string) => monthName.format(fromKey(key))

export const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
export const WEEKDAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} dk`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} sa ${m} dk` : `${h} sa`
}

export const relativeDay = (key: string, today: string) => {
  if (key === today) return 'Bugün'
  if (key === addDays(today, 1)) return 'Yarın'
  if (key === addDays(today, -1)) return 'Dün'
  return formatShort(key)
}
