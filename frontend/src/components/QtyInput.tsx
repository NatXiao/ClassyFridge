import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { UNITS, formatQty, stepDown, stepUp, type Unit } from '../state/flow'
import s from './QtyInput.module.css'

type Props = { label: string; qty: number; unit: Unit; onChange: (qty: number) => void; className?: string }

export function QtyInput({ label, qty, unit, onChange, className }: Props) {
  const { short, min, decimals } = UNITS[unit]
  // brouillon local : permet d'effacer le champ ou de taper "1," sans casser la valeur
  const [draft, setDraft] = useState<string | null>(null)

  const parse = (raw: string) => {
    const t = raw.replace(',', '.').replace(decimals ? /[^\d.]/g : /\D/g, '')
    const [int, ...dec] = t.split('.')
    return (dec.length ? `${int}.${dec.join('').slice(0, 2)}` : int).slice(0, 7)
  }

  return (
    <div className={className ? `${s.qty} ${className}` : s.qty}>
      <button type="button" aria-label={`Moins de ${label}`} disabled={qty <= min}
        onClick={() => onChange(stepDown(qty, unit))}><Minus size={18} /></button>

      <label className={s.field}>
        <span className={s.srOnly}>Quantité de {label} en {UNITS[unit].label}</span>
        <input
          type="text"
          inputMode={decimals ? 'decimal' : 'numeric'}
          value={draft !== null ? draft.replace('.', ',') : formatQty(qty)}
          onChange={(e) => {
            const v = parse(e.target.value)
            setDraft(v)
            if (Number(v) >= min) onChange(Number(v))
          }}
          onBlur={() => setDraft(null)}
          onFocus={(e) => e.target.select()}
        />
        <span aria-hidden="true">{short}</span>
      </label>

      <button type="button" aria-label={`Plus de ${label}`}
        onClick={() => onChange(stepUp(qty, unit))}><Plus size={18} /></button>
    </div>
  )
}
