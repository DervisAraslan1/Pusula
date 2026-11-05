import { ArrowRight, Check, Flag, Play, RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import { forwardRef } from 'react'
import { formatDuration } from '../lib/date'
import { postponeTask, toggleDone } from '../lib/store'
import type { Task } from '../lib/types'
import { categoryLabel } from '../lib/types'
import { useUi } from './ui'

export const TaskRow = forwardRef<HTMLLIElement, { task: Task; dateLabel?: string }>(
  function TaskRow({ task, dateLabel }, ref) {
    const { openEditor, startFocus } = useUi()

    return (
      <motion.li
        ref={ref}
        layout="position"
        className={`task ${task.done ? 'is-done' : ''}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <span className="task-time">{dateLabel ?? task.time ?? 'Serbest'}</span>
        <button
          role="checkbox"
          aria-checked={task.done}
          aria-label={`${task.title}: ${task.done ? 'tamamlanmadı olarak işaretle' : 'tamamla'}`}
          className="check"
          style={{ '--cat': `var(--cat-${task.category})` } as React.CSSProperties}
          onClick={() => toggleDone(task.id)}
        >
          <Check size={15} strokeWidth={3} aria-hidden="true" />
        </button>
        <button className="task-body" onClick={() => openEditor({ task })}>
          <span className="task-title">
            {task.priority === 'high' && !task.done && (
              <Flag size={14} className="task-flag" aria-label="Öncelikli" />
            )}
            {task.title}
          </span>
          <span className="task-meta">
            <span className="dot" style={{ background: `var(--cat-${task.category})` }} aria-hidden="true" />
            {categoryLabel(task.category)}
            <span aria-hidden="true">·</span>
            {formatDuration(task.duration)}
            {task.postponed > 0 && !task.done && (
              <span className="task-postponed">
                <RotateCcw size={12} aria-hidden="true" /> {task.postponed} kez ertelendi
              </span>
            )}
          </span>
        </button>
        {!task.done && (
          <div className="task-actions">
            <button className="icon-btn" aria-label={`${task.title}: odak modunu başlat`} title="Odaklan" onClick={() => startFocus(task.id)}>
              <Play size={17} aria-hidden="true" />
            </button>
            <button className="icon-btn" aria-label={`${task.title}: sonraki güne ertele`} title="Ertele" onClick={() => postponeTask(task.id)}>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        )}
      </motion.li>
    )
  },
)
