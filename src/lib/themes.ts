export const THEMES = [
  { id: 'lacivert', name: 'Lacivert', description: 'Derin gece mavisi', mode: 'Koyu', browserColor: '#0A1228' },
  { id: 'buz', name: 'Buz', description: 'Ferah, açık mavi', mode: 'Açık', browserColor: '#EDF2FB' },
  { id: 'kehribar', name: 'Kehribar', description: 'Sıcak amber ve antrasit', mode: 'Koyu', browserColor: '#0C0D11' },
  { id: 'kum', name: 'Kum', description: 'Kâğıt tonları, yumuşak amber', mode: 'Açık', browserColor: '#F6F2E9' },
  { id: 'zumrut', name: 'Zümrüt', description: 'Koyu yeşil ve canlı zümrüt', mode: 'Koyu', browserColor: '#08160F' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

const isTheme = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value)

/** Older versions stored only 'dark' or 'light'; anything unknown gets the default. */
export function normalizeTheme(value: unknown): ThemeId {
  if (isTheme(value)) return value
  return value === 'light' ? 'buz' : 'lacivert'
}

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id
  const color = THEMES.find((t) => t.id === id)?.browserColor
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}
