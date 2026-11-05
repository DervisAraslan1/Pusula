import { AnimatePresence, motion } from 'motion/react'
import { dismissToast, undoLast, useToast } from '../lib/store'

export function Toaster() {
  const toast = useToast()
  return (
    <div className="toaster" role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <span>{toast.message}</span>
            {toast.undo ? (
              <button onClick={undoLast}>Geri al</button>
            ) : (
              <button onClick={dismissToast}>Tamam</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
