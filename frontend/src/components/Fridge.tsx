import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import s from './Fridge.module.css'

export function Fridge({ children, door = true }: { children: ReactNode; door?: boolean }) {
  return (
    <div className={s.scene}>
      <div className={s.body}>
        <div className={s.freezer}><span className={s.handle} /></div>
        <div className={s.interior}>{children}</div>
        <div className={s.crisper} aria-hidden="true" />
      </div>
      {door && (
        <motion.div
          className={s.door}
          aria-hidden="true"
          initial={{ rotateY: 0 }}
          animate={{ rotateY: 105 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.3, 0, 0.2, 1] }}
        >
          <div className={s.doorFront}><span className={s.handle} /></div>
          <div className={s.doorBack}>
            <span className={s.bin} /><span className={s.bin} /><span className={s.bin} />
          </div>
        </motion.div>
      )}
    </div>
  )
}
