import { CalendarDays, Flame, Settings, SunMedium, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { currentStreak } from '../lib/stats'
import { useStore } from '../lib/store'
import { useUi } from './ui'

export type Route = 'bugun' | 'hafta' | 'icgoruler' | 'ayarlar'

const NAV = [
  { route: 'bugun', label: 'Bugün', icon: SunMedium },
  { route: 'hafta', label: 'Hafta', icon: CalendarDays },
  { route: 'icgoruler', label: 'İçgörüler', icon: TrendingUp },
  { route: 'ayarlar', label: 'Ayarlar', icon: Settings },
] as const

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="none" stroke="var(--accent)" strokeOpacity=".4" strokeWidth="2" />
      <path d="M22 10 18.5 18.5 10 22l3.5-8.5z" fill="var(--accent)" />
    </svg>
  )
}

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const { tasks } = useStore()
  const { today } = useUi()
  const streak = useMemo(() => currentStreak(tasks, today), [tasks, today])

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#/bugun" aria-label="Pusula ana sayfa">
          <Logo />
          <span>Pusula</span>
        </a>
        <nav aria-label="Ana menü">
          {NAV.map(({ route: target, label, icon: Icon }) => (
            <a key={target} href={`#/${target}`} aria-current={route === target ? 'page' : undefined}>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          {streak > 0 && (
            <div className="streak">
              <Flame size={18} aria-hidden="true" />
              <div>
                <strong>{streak} gün</strong>
                <span>kesintisiz seri</span>
              </div>
            </div>
          )}
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}
