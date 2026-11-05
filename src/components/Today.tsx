import { ChevronDown, Play, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { addDays, formatDuration, formatLong, minutesOfDay, relativeDay, toMinutes } from '../lib/date'
import { startEmpty, useStore } from '../lib/store'
import type { Task } from '../lib/types'
import { DayDial } from './DayDial'
import { QuickAdd } from './QuickAdd'
import { Suggestions } from './Suggestions'
import { TaskRow } from './TaskRow'
import { useUi } from './ui'

const greeting = (hour: number) =>
  hour < 5 ? 'İyi geceler' : hour < 11 ? 'Günaydın' : hour < 17 ? 'İyi günler' : hour < 22 ? 'İyi akşamlar' : 'İyi geceler'

const skyPhase = (hour: number) =>
  hour >= 5 && hour < 9 ? 'dawn' : hour >= 9 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : 'night'

const byTime = (a: Task, b: Task) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99')

function nextUp(tasks: Task[], minute: number) {
  const open = tasks.filter((t) => !t.done)
  return (
    open.filter((t) => t.time && toMinutes(t.time) + t.duration > minute).sort(byTime)[0] ??
    open.find((t) => !t.time)
  )
}

function untilLabel(task: Task, minute: number) {
  if (!task.time) return 'Saati serbest'
  const start = toMinutes(task.time)
  if (start <= minute) return 'Şu an sürüyor'
  return `${formatDuration(start - minute)} sonra`
}

export function Today() {
  const { tasks, demo } = useStore()
  const { now, today, startFocus } = useUi()
  const [showDone, setShowDone] = useState(false)
  const minute = minutesOfDay(now)

  const { todays, open, completed, late } = useMemo(() => {
    const todays = tasks.filter((t) => t.date === today)
    return {
      todays,
      open: todays.filter((t) => !t.done).sort(byTime),
      completed: todays.filter((t) => t.done).sort(byTime),
      late: tasks.filter((t) => !t.done && t.date < today && t.date >= addDays(today, -14)),
    }
  }, [tasks, today])

  const next = nextUp(todays, minute)
  const allDone = todays.length > 0 && open.length === 0

  return (
    <div className="today">
      <section className="hero" data-phase={skyPhase(now.getHours())}>
        <div className="hero-copy">
          <p className="eyebrow">{formatLong(today)}</p>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
            {greeting(now.getHours())}.
          </motion.h1>
          <p className="hero-lead">
            {allDone
              ? 'Bugünkü planın tamam. Dinlenmeyi hak ettin.'
              : todays.length === 0
                ? 'Bugün için henüz plan yok. İlk görevini aşağıdan ekle.'
                : `Bugün ${open.length} görevin kaldı, toplam ${formatDuration(open.reduce((sum, t) => sum + t.duration, 0))}.`}
          </p>
          {next && (
            <div className="next-up">
              <div>
                <span className="next-label">Sıradaki · {untilLabel(next, minute)}</span>
                <strong>{next.title}</strong>
              </div>
              <button className="btn primary" onClick={() => startFocus(next.id)}>
                <Play size={16} aria-hidden="true" /> Odaklan
              </button>
            </div>
          )}
        </div>
        <DayDial tasks={todays} />
      </section>

      {demo && (
        <div className="demo-note">
          <span>Örnek verilerle geziyorsun. Öneriler bu sahte 12 haftalık geçmişten geliyor.</span>
          <button className="btn ghost" onClick={startEmpty}>
            <X size={15} aria-hidden="true" /> Temizle ve başla
          </button>
        </div>
      )}

      <div className="today-grid">
        <section className="plan" aria-label="Bugünün planı">
          <QuickAdd />

          {late.length > 0 && (
            <>
              <h2 className="list-title">Geciken <span>{late.length}</span></h2>
              <ul className="task-list">
                <AnimatePresence mode="popLayout" initial={false}>
                  {late.map((task) => (
                    <TaskRow key={task.id} task={task} dateLabel={relativeDay(task.date, today)} />
                  ))}
                </AnimatePresence>
              </ul>
            </>
          )}

          <h2 className="list-title">Plan <span>{open.length}</span></h2>
          {open.length === 0 ? (
            <p className="empty-note">
              {allDone ? 'Hepsi tamamlandı.' : 'Yukarıya yazmaya başla: “yarın 10:00 diş kontrolü 40dk”.'}
            </p>
          ) : (
            <ul className="task-list">
              <AnimatePresence mode="popLayout" initial={false}>
                {open.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </AnimatePresence>
            </ul>
          )}

          {completed.length > 0 && (
            <>
              <button className="list-toggle" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
                <ChevronDown size={16} aria-hidden="true" className={showDone ? 'flip' : ''} />
                Tamamlananlar <span>{completed.length}</span>
              </button>
              {showDone && (
                <ul className="task-list">
                  {completed.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
        <Suggestions />
      </div>
    </div>
  )
}
