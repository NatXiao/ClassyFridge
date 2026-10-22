import { useState } from 'react'
import { Check, Plus, Minus, Clock, Users, AlertTriangle, ExternalLink } from 'lucide-react'
import type { Recipe } from '../api/client'
import { label } from '../api/labels'
import { formatAmount, toBase } from '../api/format'
import { UNITS, formatQty, type Decision } from '../state/flow'
import s from './RecipeSheet.module.css'

type Props = { recipe: Recipe; decisions: Record<string, Decision> }

export function RecipeSheet({ recipe, decisions }: Props) {
  const base = recipe.servings ?? null
  const [portions, setPortions] = useState(base ?? 2)
  const scale = base ? portions / base : 1

  // Match Spoonacular names such as "eggs" with pantry names such as "egg".
  const stockFor = (name: string) => {
    const key = Object.keys(decisions).find((k) => decisions[k].status === 'yes' && name.toLowerCase().includes(k))
    return key ? decisions[key] : undefined
  }

  const have = recipe.ingredients.filter((ingredient) => ingredient.available)
  const missing = recipe.ingredients.filter((ingredient) => !ingredient.available)

  return (
    <article className={s.sheet}>
      <header className={s.head}>
        <div className={s.titleGroup}>
          {recipe.image_url && (
            <img
              className={s.image}
              src={recipe.image_url}
              alt=""
              onError={(event) => { event.currentTarget.hidden = true }}
            />
          )}
          <div className={s.titleWithLink}>
            <h2 className={s.title}>{recipe.title}</h2>
            {recipe.source_url && (
              <a
                className={s.sourceLink}
                href={recipe.source_url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open the original recipe for ${recipe.title}`}
                title="Open original recipe"
              >
                <ExternalLink size={20} />
              </a>
            )}
          </div>
        </div>
        <div className={s.meta}>
          {recipe.preparation_time_minutes && (
            <span className={s.pill}>
              <Clock size={16} />
              {recipe.preparation_time_minutes} min
            </span>
          )}

          {base && (
            <div
              className={s.portions}
              role="group"
              aria-label="Number of servings"
            >
              <button
                type="button"
                aria-label="One fewer serving"
                disabled={portions <= 1}
                onClick={() => setPortions((p) => Math.max(1, p - 1))}
              >
                <Minus size={16} />
              </button>

              <span>
                <Users size={16} />
                {portions} serving{portions !== 1 ? 's' : ''}
              </span>

              <button
                type="button"
                aria-label="One more serving"
                onClick={() => setPortions((p) => p + 1)}
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={s.columns}>
        <section className={s.ingredients} aria-label="Ingredients">
          <h3>Ingredients</h3>

          <p className={s.groupYes}>In your fridge</p>

          <ul className={s.list}>
            {have.map((ing, i) => {
              const need = ing.amount * scale
              const stock = stockFor(ing.name)

              const neededQuantity = toBase(need, ing.unit)
              const availableQuantity = stock
                ? toBase(stock.qty, stock.unit)
                : null

              // Compare quantities only when they represent the same kind
              // of measurement: items, mass, or volume.
              const short = (
                neededQuantity !== null
                && availableQuantity !== null
                && neededQuantity.kind === availableQuantity.kind
                && availableQuantity.value < neededQuantity.value
              )

              return (
                <li key={i}>
                  <span className={s.iconYes}>
                    <Check size={14} strokeWidth={3} />
                  </span>

                  <span className={s.amount}>
                    {formatAmount(need, ing.unit)}
                  </span>

                  <span className={s.name}>
                    {label(ing.name)}
                  </span>

                  {short && stock && (
                    <span className={s.short}>
                      <AlertTriangle size={14} />
                      You have {formatQty(stock.qty)}{' '}
                      {UNITS[stock.unit].short}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>

          {missing.length > 0 && (
            <>
              <p className={s.groupMissing}>To add</p>

              <ul className={s.list}>
                {missing.map((ing, i) => (
                  <li key={i}>
                    <span className={s.iconMissing}>
                      <Plus size={14} strokeWidth={3} />
                    </span>

                    <span className={s.amount}>
                      {formatAmount(ing.amount * scale, ing.unit)}
                    </span>

                    <span className={s.name}>
                      {label(ing.name)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className={s.steps} aria-label="Instructions">
          <h3>Instructions</h3>

          <ol>
            {recipe.instructions.map((step, i) => (
              <li key={i}>
                <span className={s.stepNum}>{i + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  )
}
