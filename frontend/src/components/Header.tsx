import { Check } from 'lucide-react'
import type { FlowState } from '../state/flow'
import s from './Header.module.css'

const STEPS = [
  { key: 'upload', label: 'Photo' },
  { key: 'review', label: 'Review' },
  { key: 'recipes', label: 'Recipes' },
] as const

export function Header({ step }: { step: FlowState['step'] }) {
  const current = STEPS.findIndex((st) => st.key === step)
  return (
    <header className={s.header}>
      <span className={s.logo}>Classy<span className={s.accent}>Fridge</span></span>
      <ol className={s.steps}>
        {STEPS.map((st, i) => (
          <li key={st.key} className={i === current ? s.active : i < current ? s.done : s.todo}>
            <span className={s.dot}>{i < current ? <Check size={12} strokeWidth={3.5} /> : i + 1}</span>
            {st.label}
          </li>
        ))}
      </ol>
    </header>
  )
}
