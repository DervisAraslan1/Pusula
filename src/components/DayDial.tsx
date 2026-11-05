import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { minutesOfDay, toMinutes } from '../lib/date'
import type { Task } from '../lib/types'
import { useUi } from './ui'

const CENTER = 180
const TRACK = 142
const LANE_GAP = 13
const PROGRESS = 92
const DAY = 1440

const polar = (minute: number, radius: number) => {
  const angle = (minute / DAY) * 2 * Math.PI - Math.PI / 2
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)] as const
}

const arcPath = (from: number, to: number, radius: number) => {
  const [x1, y1] = polar(from, radius)
  const [x2, y2] = polar(to, radius)
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${to - from > DAY / 2 ? 1 : 0} 1 ${x2} ${y2}`
}

/** Puts overlapping tasks on separate rings so neither hides the other. */
function layout(tasks: Task[]) {
  const laneEnds = [0, 0, 0]
  return tasks
    .filter((t) => t.time)
    .sort((a, b) => a.time!.localeCompare(b.time!))
    .map((task) => {
      const from = toMinutes(task.time!)
      const to = Math.min(from + Math.max(task.duration, 14), DAY - 1)
      const free = laneEnds.findIndex((end) => end <= from)
      const lane = free === -1 ? laneEnds.indexOf(Math.min(...laneEnds)) : free
      laneEnds[lane] = to
      return { task, from, to, lane }
    })
}

export function DayDial({ tasks }: { tasks: Task[] }) {
  const { now, openEditor } = useUi()
  const [hovered, setHovered] = useState<Task | null>(null)
  const [swept, setSwept] = useState(false)
  const arcs = useMemo(() => layout(tasks), [tasks])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSwept(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const done = tasks.filter((t) => t.done).length
  const ratio = tasks.length ? done / tasks.length : 0
  const minute = minutesOfDay(now)
  const needle = swept ? (minute / DAY) * 360 : 0
  const nowLabel = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const complete = tasks.length > 0 && done === tasks.length

  return (
    <div className={`dial ${complete ? 'is-complete' : ''}`}>
      <svg
        viewBox="0 0 360 360"
        role="img"
        aria-label={`Gün kadranı. Saat ${nowLabel}. ${tasks.length} görevin ${done} tanesi tamamlandı.`}
      >
        <circle className="dial-face" cx={CENTER} cy={CENTER} r={172} />
        {Array.from({ length: 96 }, (_, i) => {
          const major = i % 12 === 0
          const hour = i % 4 === 0
          const [x1, y1] = polar(i * 15, 170)
          const [x2, y2] = polar(i * 15, major ? 158 : hour ? 162 : 166)
          return <line key={i} className={major ? 'tick major' : hour ? 'tick hour' : 'tick'} x1={x1} y1={y1} x2={x2} y2={y2} />
        })}
        {[0, 6, 12, 18].map((hour) => {
          const [x, y] = polar(hour * 60, 148)
          return (
            <text key={hour} className="dial-hour" x={x} y={y} dy="0.35em" textAnchor="middle">
              {String(hour).padStart(2, '0')}
            </text>
          )
        })}

        {[0, 1, 2].map((lane) => (
          <circle key={lane} className="dial-track" cx={CENTER} cy={CENTER} r={TRACK - 16 - lane * LANE_GAP} />
        ))}

        {arcs.map(({ task, from, to, lane }, i) => (
          <motion.path
            key={task.id}
            d={arcPath(from, to, TRACK - 16 - lane * LANE_GAP)}
            className={`dial-arc ${task.done ? 'done' : ''}`}
            style={{ stroke: `var(--cat-${task.category})` }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: task.done ? 0.38 : 1 }}
            transition={{ duration: 0.7, delay: 0.25 + i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
            onMouseEnter={() => setHovered(task)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => openEditor({ task })}
          />
        ))}

        <circle className="dial-progress-track" cx={CENTER} cy={CENTER} r={PROGRESS} />
        {/* A round cap would leave a dot at zero length, so nothing is drawn at 0%. */}
        {ratio > 0 && <motion.circle
          className="dial-progress"
          cx={CENTER}
          cy={CENTER}
          r={PROGRESS}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: ratio }}
          transition={{ type: 'spring', stiffness: 60, damping: 16 }}
        />}

        <g className="dial-needle" style={{ transform: `rotate(${needle}deg)` }}>
          <line x1={CENTER} y1={CENTER - 100} x2={CENTER} y2={CENTER - 150} />
          <path d={`M ${CENTER} ${CENTER - 170} l 8 16 h -16 z`} />
        </g>
      </svg>

      <div className="dial-center" aria-hidden="true">
        {hovered ? (
          <>
            <span className="dial-center-time">{hovered.time}</span>
            <span className="dial-center-title">{hovered.title}</span>
          </>
        ) : (
          <>
            <span className="dial-percent">
              %{Math.round(ratio * 100)}
            </span>
            <span className="dial-center-label">
              {done}/{tasks.length} tamamlandı
            </span>
          </>
        )}
      </div>
    </div>
  )
}
