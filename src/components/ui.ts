import { createContext, useContext, useEffect, useRef } from 'react'
import type { EditorTarget } from './TaskEditor'

interface Ui {
  now: Date
  today: string
  openEditor: (target: EditorTarget) => void
  startFocus: (id: string) => void
}

export const UiContext = createContext<Ui | null>(null)

export function useUi() {
  const ui = useContext(UiContext)
  if (!ui) throw new Error('useUi must be used inside UiContext')
  return ui
}

/**
 * Opens a native <dialog> as a modal: focus trap and Esc come from the browser.
 * Esc fires `cancel` and then `close`, so only `close` is handled here; wiring
 * both would run the callback twice.
 */
export function useModal(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])
  return { ref, onClose }
}
