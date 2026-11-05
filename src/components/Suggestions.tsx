import {
  CalendarClock,
  Compass,
  Flame,
  Gauge,
  History,
  Hourglass,
  Layers,
  Repeat,
  Scissors,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { buildSuggestions } from '../lib/suggest'
import { applySuggestion, dismissSuggestion, useStore } from '../lib/store'
import type { SuggestionKind } from '../lib/types'
import { useUi } from './ui'

const KINDS: Record<SuggestionKind, { label: string; icon: LucideIcon }> = {
  overdue: { label: 'Kalan işler', icon: History },
  recurring: { label: 'Haftalık düzen', icon: Repeat },
  habit: { label: 'Alışkanlık', icon: CalendarClock },
  peak: { label: 'Verimli saat', icon: Gauge },
  overload: { label: 'Yük dengesi', icon: Layers },
  postponed: { label: 'Tıkanıklık', icon: Scissors },
  estimate: { label: 'Süre tahmini', icon: Hourglass },
  neglected: { label: 'Denge', icon: Compass },
  streak: { label: 'Seri', icon: Flame },
}

export function Suggestions() {
  const { tasks, feedback, dismissed } = useStore()
  const { now } = useUi()
  const suggestions = useMemo(
    () => buildSuggestions(tasks, now, feedback, dismissed),
    [tasks, now, feedback, dismissed],
  )

  return (
    <section className="suggestions" aria-labelledby="suggestions-title">
      <header>
        <Sparkles size={18} aria-hidden="true" />
        <div>
          <h2 id="suggestions-title">Sana özel öneriler</h2>
          <p>Kendi geçmişinden hesaplandı</p>
        </div>
      </header>
      {suggestions.length === 0 ? (
        <p className="empty-note">
          Şimdilik önerecek bir şey yok. Birkaç gün kullandıkça kendi düzenine dayalı öneriler burada belirecek.
        </p>
      ) : (
        <ul>
          <AnimatePresence mode="popLayout" initial={false}>
            {suggestions.map((suggestion) => {
              const { label, icon: Icon } = KINDS[suggestion.kind]
              return (
                <motion.li
                  key={suggestion.key}
                  layout
                  className="suggestion"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                >
                  <div className="suggestion-top">
                    <span className="suggestion-kind">
                      <Icon size={14} aria-hidden="true" /> {label}
                    </span>
                    <button
                      className="icon-btn small"
                      aria-label={`Öneriyi kapat: ${suggestion.title}`}
                      title="Bunu gösterme"
                      onClick={() => dismissSuggestion(suggestion)}
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <h3>{suggestion.title}</h3>
                  <p>{suggestion.reason}</p>
                  {suggestion.actionLabel && (
                    <button className="btn soft" onClick={() => applySuggestion(suggestion)}>
                      {suggestion.actionLabel}
                    </button>
                  )}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
