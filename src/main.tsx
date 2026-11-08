import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const badgeFrame = document.getElementById('nl-badge-frame')
if (badgeFrame) {
  (badgeFrame as HTMLElement).style.visibility = 'hidden'
  ;(badgeFrame as HTMLElement).style.display = 'none'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)