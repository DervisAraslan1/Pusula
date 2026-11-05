import { AlertCircle, CalendarDays, Clock, CornerDownLeft, Plus, Tag, Timer } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatDuration, relativeDay } from '../lib/date'
import { parseQuickAdd } from '../lib/parse'
import { addTask, showToast, useStore } from '../lib/store'
import { categoryLabel } from '../lib/types'
import { useUi } from './ui'

export function QuickAdd() {
  const { tasks } = useStore()
  const { today } = useUi()
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key !== 'n' || event.ctrlKey || event.metaKey || event.altKey) return
      if (target.closest('input, textarea, select, dialog')) return
      event.preventDefault()
      input.current?.focus()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const parsed = value.trim() ? parseQuickAdd(value, today, tasks) : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!parsed?.title) return
    addTask(parsed)
    setValue('')
    if (parsed.date !== today) showToast(`“${parsed.title}” ${relativeDay(parsed.date, today).toLocaleLowerCase('tr')} için eklendi`)
  }

  return (
    <form className="quick" onSubmit={submit}>
      <label className="quick-field">
        <span className="sr-only">Yeni görev</span>
        <Plus size={20} aria-hidden="true" />
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Yarın 14:30 müşteri görüşmesi 45dk !"
          autoComplete="off"
          enterKeyHint="done"
        />
        {parsed?.title ? (
          <button className="quick-submit" aria-label="Görevi ekle">
            <CornerDownLeft size={16} aria-hidden="true" />
          </button>
        ) : (
          <kbd>N</kbd>
        )}
      </label>
      <AnimatePresence initial={false}>
        {parsed?.title && (
          <motion.div
            className="quick-preview"
            aria-live="polite"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="quick-chips">
              <span><CalendarDays size={14} aria-hidden="true" /> {relativeDay(parsed.date, today)}</span>
              {parsed.time && <span><Clock size={14} aria-hidden="true" /> {parsed.time}</span>}
              <span><Timer size={14} aria-hidden="true" /> {formatDuration(parsed.duration)}</span>
              <span>
                <Tag size={14} aria-hidden="true" style={{ color: `var(--cat-${parsed.category})` }} />
                {categoryLabel(parsed.category)}
              </span>
              {parsed.priority === 'high' && (
                <span><AlertCircle size={14} aria-hidden="true" /> Öncelikli</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}
