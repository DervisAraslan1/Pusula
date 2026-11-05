import { Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { addTask, deleteTask, updateTask, useStore } from '../lib/store'
import { guessCategory } from '../lib/parse'
import { CATEGORIES, type CategoryId, type Task } from '../lib/types'
import { useModal, useUi } from './ui'

export interface EditorTarget {
  task?: Task
  date?: string
}

export function TaskEditor({ target, onClose }: { target: EditorTarget; onClose: () => void }) {
  const { tasks } = useStore()
  const { today } = useUi()
  const modal = useModal(onClose)
  const { task } = target

  const [title, setTitle] = useState(task?.title ?? '')
  const [date, setDate] = useState(task?.date ?? target.date ?? today)
  const [time, setTime] = useState(task?.time ?? '')
  const [duration, setDuration] = useState(task?.duration ?? 30)
  const [category, setCategory] = useState<CategoryId | null>(task?.category ?? null)
  const [high, setHigh] = useState(task?.priority === 'high')
  const [note, setNote] = useState(task?.note ?? '')
  const [error, setError] = useState('')

  const shownCategory = category ?? guessCategory(title, tasks)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setError('Görevin bir adı olmalı.')
    const draft = {
      title: title.trim(),
      date,
      time: time || undefined,
      duration: Math.min(Math.max(duration || 30, 5), 720),
      category: shownCategory,
      priority: high ? ('high' as const) : ('normal' as const),
      note: note.trim() || undefined,
    }
    if (task) updateTask(task.id, draft)
    else addTask(draft)
    onClose()
  }

  return (
    <dialog {...modal} className="modal" aria-labelledby="editor-title">
      <form onSubmit={submit} noValidate>
        <header>
          <h2 id="editor-title">{task ? 'Görevi düzenle' : 'Yeni görev'}</h2>
          <button type="button" className="icon-btn" aria-label="Kapat" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <label className="field">
          <span>Görev</span>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError('')
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'title-error' : undefined}
            data-autofocus
          />
          {error && <small id="title-error" className="field-error">{error}</small>}
        </label>

        <div className="field-row">
          <label className="field">
            <span>Tarih</span>
            <input type="date" value={date} required onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Saat (isteğe bağlı)</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="field">
            <span>Süre (dk)</span>
            <input type="number" min={5} max={720} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </label>
        </div>

        <fieldset className="field">
          <legend>Alan</legend>
          <div className="segments">
            {CATEGORIES.map((c) => (
              <label key={c.id} className={shownCategory === c.id ? 'is-on' : ''}>
                <input type="radio" name="category" className="sr-only" checked={shownCategory === c.id} onChange={() => setCategory(c.id)} />
                <span className="dot" style={{ background: `var(--cat-${c.id})` }} aria-hidden="true" />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>Not</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <label className="switch">
          <input type="checkbox" checked={high} onChange={(e) => setHigh(e.target.checked)} />
          <span aria-hidden="true" />
          Öncelikli görev
        </label>

        <footer>
          {task && (
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                deleteTask(task.id)
                onClose()
              }}
            >
              <Trash2 size={16} aria-hidden="true" /> Sil
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn primary">{task ? 'Kaydet' : 'Ekle'}</button>
        </footer>
      </form>
    </dialog>
  )
}
