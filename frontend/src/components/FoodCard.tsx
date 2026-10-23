import { useState } from 'react'
import { Check, X, Trash2, Camera, ListChecks, Loader2 } from 'lucide-react'
import { QtyInput } from './QtyInput'
import { label } from '../api/labels'
import { CLASSES } from '../api/classes'
import type { Decision } from '../state/flow'
import s from './FoodCard.module.css'

type Props = {
  card: Decision
  onDecide: (d: Partial<Pick<Decision, 'status' | 'qty' | 'unit'>>) => void
  onReject: () => void
  onSelect: (name: string) => void
  onRetake: () => void
  onRemove: () => void
}

const STATUS_TEXT = { yes: 'Confirmed', no: 'Discarded', null: 'To check' } as const

export function FoodCard({ card, onDecide, onReject, onSelect, onRetake, onRemove }: Props) {
  const { status, qty, unit, candidates, attempt, exhausted, classifying, manual } = card
  const [selecting, setSelecting] = useState(false)
  const name = label(card.name)
  const current = candidates[attempt]
  const needsManualChoice = exhausted && status !== 'no'

  const pick = (value: string) => {
    onSelect(value)
    setSelecting(false)
  }

  return (
    <article className={`${s.card} ${s[`status_${status}`]} ${needsManualChoice ? s.exhausted : ''}`}>
      {/* --- image + badges --- */}
      <div className={s.crop}>
        {card.crop
          ? <img src={card.crop} alt="" />
          : manual
            ? <span className={s.initial} aria-hidden="true">{name.charAt(0)}</span>
            : <span className={s.placeholder} aria-hidden="true" />}
        {manual && <span className={s.unsure}>added</span>}
        {!manual && attempt > 0 && !exhausted && (
          <span className={s.unsure}>guess {attempt + 1}/{candidates.length}</span>
        )}
        {!manual && attempt === 0 && current && current.confidence < 0.6 && (
          <span className={s.unsure}>unsure</span>
        )}
        {classifying && (
          <span className={s.busy} role="status"><Loader2 size={22} className={s.spin} /> Analysing…</span>
        )}
      </div>

      {/* --- name + status --- */}
      <div className={s.row}>
        <span className={s.name} aria-live="polite">{needsManualChoice ? 'None of these?' : name}</span>
        <span className={s.statusText}>
          {manual ? 'Added' : needsManualChoice ? 'Your call' : STATUS_TEXT[`${status}`]}
        </span>
      </div>

      {/* --- controls: one of 5 states --- */}
      {manual ? (
        <>
          <QtyInput label={name} qty={qty} unit={unit} onChange={(q) => onDecide({ qty: q })} />
          <div className={s.actions}>
            <button type="button" className={s.remove} onClick={onRemove}><Trash2 size={16} /> Remove</button>
          </div>
        </>
      ) : classifying ? null : needsManualChoice && selecting ? (
        <div className={s.picker}>
          <ul className={s.choices} aria-label="Model guesses">
            {candidates.map((c) => (
              <li key={c.ingredient_name}>
                <button type="button" onClick={() => pick(c.ingredient_name)}>
                  <span>{label(c.ingredient_name)}</span>
                  <span className={s.percent}>{Math.round(c.confidence * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
          <label className={s.other}>
            <span className={s.srOnly}>Another food</span>
            <select value="" onChange={(e) => e.target.value && pick(e.target.value)}>
              <option value="" disabled>Other…</option>
              {CLASSES.filter((c) => !candidates.some((p) => p.ingredient_name === c.value)).map((c) => (
                <option key={c.value} value={c.value}>{c.text}</option>
              ))}
            </select>
          </label>
          <button type="button" className={s.back} onClick={() => setSelecting(false)}>Back</button>
        </div>
      ) : needsManualChoice ? (
        <div className={s.picker}>
          {card.error && <p className={s.error} role="alert">{card.error}</p>}
          <button type="button" className={s.choice} onClick={() => setSelecting(true)}>
            <ListChecks size={16} /> Select
          </button>
          <button type="button" className={s.choice} onClick={onRetake}>
            <Camera size={16} /> Retake photo
          </button>
          <button
            type="button"
            className={s.discardChoice}
            onClick={() => onDecide({ status: 'no' })}
          >
            <Trash2 size={16} /> Discard item
          </button>
        </div>
      ) : exhausted && status === 'no' ? (
        <div className={s.actions}>
          <button
            type="button"
            className={`${s.no} ${s.fullWidth}`}
            aria-pressed="true"
            onClick={() => onDecide({ status: null })}
          >
            <X size={16} strokeWidth={3} /> Undo discard
          </button>
        </div>
      ) : (
        <div className={s.actions}>
          <button type="button" className={s.yes} aria-pressed={status === 'yes'}
            onClick={() => onDecide({ status: status === 'yes' ? null : 'yes' })}>
            <Check size={16} strokeWidth={3} /> Yes
          </button>
          <button
            type="button"
            className={s.no}
            aria-pressed={status === 'no'}
            onClick={onReject}
          >
            <X size={16} strokeWidth={3} /> No
          </button>
          <button
            type="button"
            className={`${s.discardChoice} ${s.fullWidth}`}
            aria-pressed={status === 'no'}
            onClick={() => onDecide({ status: status === 'no' ? null : 'no' })}
          >
            <Trash2 size={16} /> {status === 'no' ? 'Undo discard' : 'Discard item'}
          </button>
        </div>
      )}
    </article>
  )
}
