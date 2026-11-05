import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { addDays, formatShort, startOfWeek, WEEKDAYS } from '../lib/date'
import { moveTaskToDate, useStore } from '../lib/store'
import { useUi } from './ui'

export function Week() {
  const { tasks } = useStore()
  const { today, openEditor } = useUi()
  const [offset, setOffset] = useState(0)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const monday = addDays(startOfWeek(today), offset * 7)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday])

  const onDrop = (event: DragEvent, date: string) => {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain')
    if (id) moveTaskToDate(id, date)
    setDropTarget(null)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{formatShort(days[0])} – {formatShort(days[6])}</p>
          <h1>Haftan</h1>
        </div>
        <div className="week-nav">
          <button className="icon-btn" aria-label="Önceki hafta" onClick={() => setOffset(offset - 1)}>
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button className="btn ghost" disabled={offset === 0} onClick={() => setOffset(0)}>Bu hafta</button>
          <button className="icon-btn" aria-label="Sonraki hafta" onClick={() => setOffset(offset + 1)}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="week">
        {days.map((date, i) => {
          const items = tasks
            .filter((t) => t.date === date)
            .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))
          const done = items.filter((t) => t.done).length
          return (
            <section
              key={date}
              className={`day ${date === today ? 'is-today' : ''} ${dropTarget === date ? 'is-target' : ''}`}
              aria-label={`${WEEKDAYS[i]}, ${formatShort(date)}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDropTarget(date)
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => onDrop(e, date)}
            >
              <header>
                <div>
                  <h2>{WEEKDAYS[i]}</h2>
                  <span>{formatShort(date)}</span>
                </div>
                <button className="icon-btn small" aria-label={`${WEEKDAYS[i]} gününe görev ekle`} onClick={() => openEditor({ date })}>
                  <Plus size={16} aria-hidden="true" />
                </button>
              </header>
              {items.length > 0 && (
                <div
                  className="day-load"
                  role="img"
                  aria-label={`${items.length} görevin ${done} tanesi tamamlandı`}
                >
                  <span style={{ width: `${(done / items.length) * 100}%` }} />
                </div>
              )}
              <ul>
                {items.map((task) => (
                  <li key={task.id}>
                    <button
                      className={`chip ${task.done ? 'is-done' : ''}`}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                      onClick={() => openEditor({ task })}
                      style={{ '--cat': `var(--cat-${task.category})` } as React.CSSProperties}
                    >
                      {task.time && <time>{task.time}</time>}
                      <span>{task.title}</span>
                      {task.done && <Check size={13} aria-label="Tamamlandı" />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
