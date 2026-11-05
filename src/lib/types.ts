export type CategoryId = 'is' | 'kisisel' | 'saglik' | 'ogrenme' | 'ev'
export type Priority = 'normal' | 'high'

export interface Task {
  id: string
  title: string
  /** Local calendar day, YYYY-MM-DD. */
  date: string
  /** Local time, HH:MM. Unscheduled tasks have none. */
  time?: string
  /** Planned length in minutes. */
  duration: number
  category: CategoryId
  priority: Priority
  note?: string
  done: boolean
  completedAt?: string
  /** Minutes actually measured in focus mode. */
  actualMinutes?: number
  /** How many times the task was pushed to a later day. */
  postponed: number
  createdAt: string
}

export type TaskDraft = Pick<Task, 'title' | 'date' | 'duration' | 'category' | 'priority'> &
  Pick<Partial<Task>, 'time' | 'note'>

export type SuggestionKind =
  | 'overdue'
  | 'recurring'
  | 'habit'
  | 'peak'
  | 'overload'
  | 'postponed'
  | 'estimate'
  | 'neglected'
  | 'streak'

export type SuggestionAction =
  | { type: 'add'; draft: TaskDraft }
  | { type: 'move'; ids: string[]; date: string }
  | { type: 'schedule'; id: string; time: string }
  | { type: 'shrink'; id: string; minutes: number; time?: string }
  | { type: 'scale'; ids: string[]; factor: number }
  | { type: 'none' }

export interface Suggestion {
  /** Stable key used to remember dismissals. */
  key: string
  kind: SuggestionKind
  title: string
  /** The evidence: why this suggestion exists, in the user's own numbers. */
  reason: string
  actionLabel?: string
  action: SuggestionAction
  score: number
  /** How many days a dismissal hides this suggestion. */
  snoozeDays: number
}

export type Feedback = Partial<Record<SuggestionKind, { accepted: number; dismissed: number }>>

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'is', label: 'İş' },
  { id: 'kisisel', label: 'Kişisel' },
  { id: 'saglik', label: 'Sağlık' },
  { id: 'ogrenme', label: 'Öğrenme' },
  { id: 'ev', label: 'Ev' },
]

export const categoryLabel = (id: CategoryId) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? id
