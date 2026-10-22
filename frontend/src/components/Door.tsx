import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import s from './Door.module.css'

export function Door({ children }: { children: ReactNode }) {
  return (
    <div className={s.hingeArea}>
      <motion.div
        className={s.door}
        initial={{ rotateY: -180 }}
        animate={{ rotateY: 0 }}
        transition={{ delay: 0.2, duration: 1.1, ease: [0.3, 0, 0.2, 1] }}
      >
        <div className={s.inside}>{children}</div>
        <div className={s.outside} aria-hidden="true"><span className={s.handle} /></div>
      </motion.div>
    </div>
  )
}
