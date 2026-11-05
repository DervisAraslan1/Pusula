import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { FocusMode } from './components/FocusMode'
import { Insights } from './components/Insights'
import { Settings } from './components/Settings'
import { Shell, type Route } from './components/Shell'
import { TaskEditor, type EditorTarget } from './components/TaskEditor'
import { Toaster } from './components/Toaster'
import { Today } from './components/Today'
import { UiContext } from './components/ui'
import { Week } from './components/Week'
import { Welcome } from './components/Welcome'
import { toKey } from './lib/date'
import { useStore } from './lib/store'

const ROUTES: Route[] = ['bugun', 'hafta', 'icgoruler', 'ayarlar']

const subscribeHash = (listener: () => void) => {
  addEventListener('hashchange', listener)
  return () => removeEventListener('hashchange', listener)
}

const readRoute = (): Route => {
  const hash = location.hash.replace('#/', '') as Route
  return ROUTES.includes(hash) ? hash : 'bugun'
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const timer = setInterval(tick, 20_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return now
}

export default function App() {
  const state = useStore()
  const route = useSyncExternalStore(subscribeHash, readRoute)
  const now = useNow()
  const today = toKey(now)
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)

  const openEditor = useCallback((target: EditorTarget) => setEditor(target), [])
  const startFocus = useCallback((id: string) => setFocusId(id), [])
  const ui = useMemo(
    () => ({ now, today, openEditor, startFocus }),
    [now, today, openEditor, startFocus],
  )

  const focusTask = state.tasks.find((t) => t.id === focusId)

  return (
    <UiContext.Provider value={ui}>
      {state.onboarded ? (
        <Shell route={route}>
          {route === 'bugun' && <Today />}
          {route === 'hafta' && <Week />}
          {route === 'icgoruler' && <Insights />}
          {route === 'ayarlar' && <Settings />}
        </Shell>
      ) : (
        <Welcome />
      )}
      {editor && <TaskEditor target={editor} onClose={() => setEditor(null)} />}
      {focusTask && <FocusMode task={focusTask} onClose={() => setFocusId(null)} />}
      <Toaster />
    </UiContext.Provider>
  )
}
