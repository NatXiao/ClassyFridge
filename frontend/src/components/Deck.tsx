import { useState, type Dispatch } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react'
import { FoodCard } from './FoodCard'
import type { Decision, FlowAction } from '../state/flow'
import s from './Deck.module.css'

type Props = {
  cards: Decision[]
  index: number
  dispatch: Dispatch<FlowAction>
  onReject: (card: Decision) => void
  onSelect: (id: string, name: string) => void
  onRetake: (id: string) => void
}

export function Deck({ cards, index, dispatch, onReject, onSelect, onRetake }: Props) {
  const [pos, setPos] = useState(0)
  const n = cards.length
  const i = Math.min(pos, n - 1)
  const card = cards[i]
  const confirmed = cards.filter((c) => c.status === 'yes').length
  // cards still on the model's first guess: safe to confirm in one click
  const untouched = cards.filter(
    (c) => c.status === null && c.attempt === 0 && !c.exhausted && !c.classifying,
  )

  // after a "Yes", bring the next card still to check to the front
  const nextPending = () => {
    for (let k = 1; k < n; k++) {
      const j = (i + k) % n
      if (cards[j].status === null) return setPos(j)
    }
  }

  return (
    <motion.li
      className={s.slot}
      initial={{ opacity: 0, y: -28, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: card.manual ? 0 : 1 + index * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
    >
      <div className={s.stack}>
        {n > 2 && <div className={`${s.layer} ${s.layer2}`} aria-hidden="true" />}
        {n > 1 && <div className={`${s.layer} ${s.layer1}`} aria-hidden="true" />}
        {n > 1 && <span className={s.count} aria-label={`${n} items, ${confirmed} confirmed`}>×{n}</span>}

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={card.id}
            className={s.front}
            initial={{ x: 40, opacity: 0, rotate: 3 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={{ x: -40, opacity: 0, rotate: -3 }}
            transition={{ duration: 0.2 }}
          >
            <FoodCard
              card={card}
              onDecide={(d) => {
                dispatch({ type: 'decide', id: card.id, decision: d })
                if (d.status === 'yes' || d.status === 'no') nextPending()
              }}
              onReject={() => onReject(card)}
              onSelect={(name) => {
                onSelect(card.id, name)
                nextPending()
              }}
              onRetake={() => onRetake(card.id)}
              onRemove={() => dispatch({ type: 'remove', id: card.id })}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {n > 1 ? (
        <div className={s.nav}>
          <button type="button" aria-label="Previous card" onClick={() => setPos((i - 1 + n) % n)}>
            <ChevronLeft size={18} />
          </button>
          <span>{i + 1} / {n} · {confirmed} ✓</span>
          <button type="button" aria-label="Next card" onClick={() => setPos((i + 1) % n)}>
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className={s.navPlaceholder} aria-hidden="true" />
      )}

      {untouched.length > 1 ? (
        <button type="button" className={s.all} onClick={() => dispatch({ type: 'confirmAll', group: card.group })}>
          <CheckCheck size={16} /> Yes to all {untouched.length}
        </button>
      ) : (
        <div className={s.allPlaceholder} aria-hidden="true" />
      )}
    </motion.li>
  )
}
