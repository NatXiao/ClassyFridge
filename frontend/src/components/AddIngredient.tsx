import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'
import { SUGGESTIONS, toEnglish } from '../api/labels'
import { UNITS, type Unit } from '../state/flow'
import { QtyInput } from './QtyInput'
import s from './AddIngredient.module.css'

type Props = { onAdd: (name: string, qty: number, unit: Unit) => void }

// "Bœuf" et "boeuf", "Pâtes" et "pates" doivent se trouver
const norm = (t: string) =>
  t.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/œ/g, 'oe').toLowerCase().trim()

export function AddIngredient({ onAdd }: Props) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState<Unit>('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listId = useId()

  const matches = SUGGESTIONS
    .map(([fr]) => fr)
    .filter((fr) => norm(fr).includes(norm(name)) && norm(fr) !== norm(name))
    .slice(0, 8)
  const showList = open && matches.length > 0

  const pick = (fr: string) => {
    setName(fr)
    setOpen(false)
    setActive(-1)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, -1))
    } else if (e.key === 'Enter' && showList && active >= 0) {
      e.preventDefault() // choisir la suggestion, pas envoyer le formulaire
      pick(matches[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(toEnglish(name), qty, unit)
    setName('')
    setQty(1)
    setUnit('')
    setOpen(false)
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <h3 className={s.title}>Il manque quelque chose&nbsp;?</h3>

      <div className={s.field}>
        <label htmlFor={`${listId}-input`}>Aliment</label>
        <div className={s.combo}>
          <input
            id={`${listId}-input`}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            value={name}
            placeholder="ex. Viande hachée"
            onChange={(e) => { setName(e.target.value); setOpen(true); setActive(-1) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
          {showList && (
            <ul id={listId} role="listbox" className={s.listbox}>
              {matches.map((fr, i) => (
                <li
                  key={fr}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? s.optionActive : s.option}
                  // mousedown + preventDefault : le champ ne perd pas le focus avant le clic
                  onMouseDown={(e) => { e.preventDefault(); pick(fr) }}
                  onMouseEnter={() => setActive(i)}
                >
                  {fr}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={`${s.small} ${s.qtyField}`}>
        <span>Quantité</span>
        <QtyInput label="l'aliment" qty={qty} unit={unit} onChange={setQty} className={s.qtyBox} />
      </div>

      <label className={s.small}>
        <span>Unité</span>
        <select value={unit} onChange={(e) => {
          const u = e.target.value as Unit
          setUnit(u)
          setQty(UNITS[u].initial)
        }}>
          {(Object.keys(UNITS) as Unit[]).map((u) => (
            <option key={u} value={u}>{UNITS[u].label}</option>
          ))}
        </select>
      </label>

      <button type="submit" className={s.add}><Plus size={18} /> Ajouter</button>
    </form>
  )
}
