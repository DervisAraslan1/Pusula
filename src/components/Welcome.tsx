import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { startEmpty, startWithDemo } from '../lib/store'
import { Logo } from './Shell'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] as const },
})

export function Welcome() {
  return (
    <main className="welcome">
      <div className="welcome-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <motion.div className="welcome-brand" {...rise(0)}>
        <Logo />
        <span>Pusula</span>
      </motion.div>
      <motion.h1 {...rise(0.1)}>
        Her güne<br />
        <em>yönünü bilerek</em> başla.
      </motion.h1>
      <motion.p {...rise(0.2)}>
        Gününü planla, yaptıklarını takip et. Pusula alışkanlıklarını öğrenir, sana kendi verilerinle öneri sunar. Her şey bu cihazda kalır.
      </motion.p>
      <motion.div className="welcome-actions" {...rise(0.3)}>
        <button className="btn primary large" onClick={startWithDemo}>
          Örnek verilerle keşfet <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button className="btn ghost large" onClick={startEmpty}>Boş başla</button>
      </motion.div>
    </main>
  )
}
