import { useSyncExternalStore } from 'react'
import { addDays, toKey } from './date'
import { buildDemoTasks } from './seed'
import { applyTheme, normalizeTheme, type ThemeId } from './themes'
import type { Feedback, Suggestion, Task, TaskDraft } from './types'

const STORAGE_KEY = 'pusula:v1'

export interface State {
  tasks: Task[]
  feedback: Feedback
  dismissed: Record<string, string>
  theme: ThemeId
  onboarded: boolean
  demo: boolean
}

export interface Toast {
  id: number
  message: string
  undo?: Task[]
}

const initial = (): State => ({
  tasks: [],
  feedback: {},
  dismissed: {},
  theme: normalizeTheme(matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  onboarded: false,
  demo: false,
})

function load(): State {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return initial()
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.tasks)) throw new Error('invalid shape')
    return { ...initial(), ...parsed, theme: normalizeTheme(parsed.theme) }
  } catch {
    // Keep unreadable data instead of letting the next save overwrite it.
    localStorage.setItem(`${STORAGE_KEY}:bozuk:${Date.now()}`, raw)
    return initial()
  }
}

let state = load()
// Applied here, before the first render, so a saved theme never flashes the default.
applyTheme(state.theme)
let toast: Toast | null = null
let toastTimer: ReturnType<typeof setTimeout> | undefined
let toastSerial = 0
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    showToast('Değişiklikler kaydedilemedi. Tarayıcı depolama alanını kontrol et.')
  }
  notify()
}

export function showToast(message: string, undo?: Task[]) {
  clearTimeout(toastTimer)
  toast = { id: ++toastSerial, message, undo }
  toastTimer = setTimeout(dismissToast, 6000)
  notify()
}

export function dismissToast() {
  clearTimeout(toastTimer)
  toast = null
  notify()
}

export function undoLast() {
  if (toast?.undo) setState({ tasks: toast.undo })
  dismissToast()
}

// Keeps two open tabs from overwriting each other's work.
addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    state = load()
    applyTheme(state.theme)
    notify()
  }
})

export const useStore = () => useSyncExternalStore(subscribe, () => state)
export const useToast = () => useSyncExternalStore(subscribe, () => toast)

const makeTask = (draft: TaskDraft): Task => ({
  ...draft,
  id: crypto.randomUUID(),
  done: false,
  postponed: 0,
  createdAt: new Date().toISOString(),
})

const patchTask = (id: string, patch: Partial<Task>) =>
  state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))

export const addTask = (draft: TaskDraft) => setState({ tasks: [...state.tasks, makeTask(draft)] })

export const updateTask = (id: string, patch: Partial<Task>) => setState({ tasks: patchTask(id, patch) })

export function toggleDone(id: string) {
  const task = state.tasks.find((t) => t.id === id)
  if (!task) return
  updateTask(
    id,
    task.done
      ? { done: false, completedAt: undefined }
      : { done: true, completedAt: new Date().toISOString() },
  )
}

export function deleteTask(id: string) {
  const before = state.tasks
  const task = before.find((t) => t.id === id)
  setState({ tasks: before.filter((t) => t.id !== id) })
  if (task) showToast(`“${task.title}” silindi`, before)
}

function moveTasks(ids: string[], date: string) {
  const targets = new Set(ids)
  return state.tasks.map((t) =>
    targets.has(t.id) ? { ...t, date, postponed: t.postponed + 1, time: t.date === date ? t.time : undefined } : t,
  )
}

export function postponeTask(id: string) {
  const before = state.tasks
  const task = before.find((t) => t.id === id)
  if (!task) return
  setState({ tasks: moveTasks([id], addDays(task.date, 1)) })
  showToast(`“${task.title}” sonraki güne alındı`, before)
}

/** Dragging to a day keeps the time: it is planning, not postponing. */
export function moveTaskToDate(id: string, date: string) {
  updateTask(id, { date })
}

export function logFocus(id: string, minutes: number) {
  const task = state.tasks.find((t) => t.id === id)
  if (task) updateTask(id, { actualMinutes: (task.actualMinutes ?? 0) + minutes })
}

function recordFeedback(suggestion: Suggestion, field: 'accepted' | 'dismissed') {
  const current = state.feedback[suggestion.kind] ?? { accepted: 0, dismissed: 0 }
  return { ...state.feedback, [suggestion.kind]: { ...current, [field]: current[field] + 1 } }
}

export function applySuggestion(suggestion: Suggestion) {
  const { action } = suggestion
  const before = state.tasks
  const tasks = (() => {
    switch (action.type) {
      case 'add':
        return [...before, makeTask(action.draft)]
      case 'move':
        return moveTasks(action.ids, action.date)
      case 'schedule':
        return patchTask(action.id, { time: action.time })
      case 'shrink':
        return patchTask(action.id, { duration: action.minutes, time: action.time, date: toKey(new Date()) })
      case 'scale': {
        const targets = new Set(action.ids)
        return before.map((t) =>
          targets.has(t.id)
            ? { ...t, duration: Math.round((t.duration * action.factor) / 5) * 5 }
            : t,
        )
      }
      case 'none':
        return before
    }
  })()
  setState({ tasks, feedback: recordFeedback(suggestion, 'accepted') })
  showToast('Öneri uygulandı', before)
}

export function dismissSuggestion(suggestion: Suggestion) {
  setState({
    feedback: recordFeedback(suggestion, 'dismissed'),
    dismissed: {
      ...state.dismissed,
      [suggestion.key]: addDays(toKey(new Date()), suggestion.snoozeDays),
    },
  })
}

export function setTheme(theme: ThemeId) {
  applyTheme(theme)
  setState({ theme })
}

export const startWithDemo = () =>
  setState({ tasks: buildDemoTasks(toKey(new Date())), onboarded: true, demo: true })

export const startEmpty = () => setState({ tasks: [], feedback: {}, dismissed: {}, onboarded: true, demo: false })

export function exportData() {
  const { tasks, feedback, dismissed } = state
  const blob = new Blob([JSON.stringify({ tasks, feedback, dismissed }, null, 2)], {
    type: 'application/json',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `pusula-yedek-${toKey(new Date())}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

const isTask = (value: unknown): value is Task => {
  const task = value as Task
  return (
    typeof task?.id === 'string' &&
    typeof task.title === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(task.date) &&
    typeof task.duration === 'number'
  )
}

export async function importData(file: File) {
  try {
    const parsed = JSON.parse(await file.text())
    if (!Array.isArray(parsed?.tasks) || !parsed.tasks.every(isTask)) throw new Error('invalid')
    const before = state.tasks
    setState({
      tasks: parsed.tasks,
      feedback: parsed.feedback ?? {},
      dismissed: parsed.dismissed ?? {},
      onboarded: true,
      demo: false,
    })
    showToast(`${parsed.tasks.length} görev içe aktarıldı`, before)
  } catch {
    showToast('Bu dosya geçerli bir Pusula yedeği değil.')
  }
}
