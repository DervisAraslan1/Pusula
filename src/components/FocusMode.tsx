import { Check, Pause, Play, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { logFocus, toggleDone } from '../lib/store'
import type { Task } from '../lib/types'
import { useModal } from './ui'

const RADIUS = 150
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const clock = (ms: number) => {
  const total = Math.ceil(Math.abs(ms) / 1000)
  const text = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  return ms < 0 ? `+${text}` : text
}

export function FocusMode({ task, onClose }: { task: Task; onClose: () => void }) {
  // Elapsed time is measured from timestamps: background tabs throttle timers,
  // so counting ticks would drift.
  const banked = useRef(0)
  const startedAt = useRef<number | null>(Date.now())
  const [, setTick] = useState(0)
  const [running, setRunning] = useState(true)

  const elapsed = () => banked.current + (startedAt.current ? Date.now() - startedAt.current : 0)
  const total = task.duration * 60_000
  const remaining = total - elapsed()

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 500)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const previous = document.title
    document.title = `${clock(remaining)} · ${task.title}`
    return () => {
      document.title = previous
    }
  })

  const toggle = () => {
    if (startedAt.current) {
      banked.current += Date.now() - startedAt.current
      startedAt.current = null
    } else {
      startedAt.current = Date.now()
    }
    setRunning(!running)
  }

  const finish = (markDone: boolean) => {
    const minutes = Math.round(elapsed() / 60_000)
    if (minutes > 0) logFocus(task.id, minutes)
    if (markDone) toggleDone(task.id)
    onClose()
  }

  const modal = useModal(() => finish(false))

  return (
    <dialog {...modal} className="focus" aria-label={`Odak modu: ${task.title}`}>
      <div className="focus-inner">
        <button className="icon-btn focus-close" aria-label="Odak modundan çık" onClick={() => finish(false)}>
          <X size={22} aria-hidden="true" />
        </button>
        <p className="eyebrow">Odak modu</p>
        <h2>{task.title}</h2>
        <div className="focus-ring">
          <svg viewBox="0 0 340 340" aria-hidden="true">
            <circle cx="170" cy="170" r={RADIUS} className="focus-track" />
            <circle
              cx="170"
              cy="170"
              r={RADIUS}
              className="focus-progress"
              transform="rotate(-90 170 170)"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - Math.max(remaining, 0) / total)}
            />
          </svg>
          <div className="focus-clock" role="timer">
            {clock(remaining)}
            {remaining < 0 && <small>planlanan süreyi aştın</small>}
          </div>
        </div>
        <div className="focus-actions">
          <button className="btn ghost large" onClick={toggle}>
            {running ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            {running ? 'Duraklat' : 'Devam et'}
          </button>
          <button className="btn primary large" onClick={() => finish(true)}>
            <Check size={18} aria-hidden="true" /> Bitirdim
          </button>
        </div>
      </div>
    </dialog>
  )
}
