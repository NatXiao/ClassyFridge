import { motion } from 'motion/react'
import { Check, X, Trash2 } from 'lucide-react'
import { QtyInput } from './QtyInput'
import type { Decision } from '../state/flow'
import s from './FoodCard.module.css'

type Props = {
  label: string
  crop?: string
  unsure: boolean
  manual?: boolean
  decision: Decision
  index: number
  onDecide: (d: Partial<Decision>) => void
  onRemove?: () => void
}

const STATUS_TEXT = { yes: 'Validé', no: 'Refusé', null: 'À vérifier' } as const

export function FoodCard({ label, crop, unsure, manual, decision, index, onDecide, onRemove }: Props) {
  const { status, qty, unit } = decision

  return (
    <motion.li
      className={`${s.card} ${s[`status_${status}`]}`}
      initial={{ opacity: 0, y: -28, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // les aliments détectés attendent l'ouverture de la porte, les ajouts apparaissent tout de suite
      transition={{ delay: manual ? 0 : 1 + index * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
    >
      <div className={s.crop}>
        {crop
          ? <img src={crop} alt="" />
          : manual
            ? <span className={s.initial} aria-hidden="true">{label.charAt(0)}</span>
            : <span className={s.placeholder} aria-hidden="true" />}
        {manual && <span className={s.unsure}>ajouté</span>}
        {!manual && unsure && <span className={s.unsure}>pas sûr</span>}
      </div>

      <div className={s.row}>
        <span className={s.name}>{label}</span>
        <span className={s.statusText}>{manual ? 'Ajouté' : STATUS_TEXT[`${status}`]}</span>
      </div>

      <QtyInput label={label} qty={qty} unit={unit} onChange={(q) => onDecide({ qty: q })} />

      {manual ? (
        <div className={s.actions}>
          <button type="button" className={s.remove} onClick={onRemove}>
            <Trash2 size={16} /> Retirer
          </button>
        </div>
      ) : (
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
      )}
    </motion.li>
  )
}
