import { motion } from 'motion/react'
import { Check, X, Minus, Plus } from 'lucide-react'
import type { Decision } from '../state/flow'
import s from './FoodCard.module.css'

type Props = {
  label: string
  crop?: string
  unsure: boolean
  decision: Decision
  index: number
  onDecide: (d: Partial<Decision>) => void
}

const STATUS_TEXT = { yes: 'Validé', no: 'Refusé', null: 'À vérifier' } as const

export function FoodCard({ label, crop, unsure, decision, index, onDecide }: Props) {
  const { status, qty } = decision
  return (
    <motion.li
      className={`${s.card} ${s[`status_${status}`]}`}
      initial={{ opacity: 0, y: -28, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1 + index * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
    >
      <div className={s.crop}>
        {crop ? <img src={crop} alt="" /> : <span className={s.placeholder} aria-hidden="true" />}
        {unsure && <span className={s.unsure}>pas sûr</span>}
      </div>

      <div className={s.row}>
        <span className={s.name}>{label}</span>
        <span className={s.statusText}>{STATUS_TEXT[`${status}`]}</span>
      </div>

      <div className={s.qty}>
        <button type="button" aria-label={`Retirer un ${label}`} onClick={() => onDecide({ qty: Math.max(1, qty - 1) })}><Minus size={18} /></button>
        <span>× {qty}</span>
        <button type="button" aria-label={`Ajouter un ${label}`} onClick={() => onDecide({ qty: qty + 1 })}><Plus size={18} /></button>
      </div>

      <div className={s.actions}>
        <button type="button" className={s.yes} aria-pressed={status === 'yes'}
          onClick={() => onDecide({ status: status === 'yes' ? null : 'yes' })}>
          <Check size={16} strokeWidth={3} /> Oui
        </button>
        <button type="button" className={s.no} aria-pressed={status === 'no'}
          onClick={() => onDecide({ status: status === 'no' ? null : 'no' })}>
          <X size={16} strokeWidth={3} /> Non
        </button>
      </div>
    </motion.li>
  )
}
