import { useState, type Dispatch } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Recipe } from '../api/client'
import { label } from '../api/labels'
import { confirmedStock, type Decision, type FlowAction } from '../state/flow'
import s from './RecipesScreen.module.css'
import { RecipeSheet } from '../components/RecipeSheet'

type Props = {
  recipes: Recipe[]
  decisions: Record<string, Decision>
  dispatch: Dispatch<FlowAction>
}

export function RecipesScreen({ recipes, decisions, dispatch }: Props) {
  const [selected, setSelected] = useState(0)
  const [failedThumbnailIds, setFailedThumbnailIds] = useState<Set<string>>(new Set())
  const pantry = confirmedStock(decisions)
  const recipe = recipes[selected]

  return (
    <main className={s.layout}>
      <div className={s.fridgeBottom}>
        <span>Étagères vides — <strong>{pantry.length} aliments</strong> sont descendus sur la table</span>
        <button type="button" className={s.link} onClick={() => dispatch({ type: 'backToReview' })}>Modifier</button>
      </div>

      <section className={s.table} aria-label="La table">
        <ul className={s.pantry} aria-label="Aliments validés">
          {pantry.map((item, i) => (
            <motion.li key={`${item.name}|${item.unit}`} className={s.chip}
              initial={{ opacity: 0, y: -160 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 220, damping: 20 }}>
              <span className={s.chipDot} aria-hidden="true" />
              {label(item.name)} <span className={s.muted}>×{item.qty}</span>
            </motion.li>
          ))}
        </ul>

        {recipes.length === 0 ? (
          <div className={s.sheet}>
            <h2>Aucune recette trouvée</h2>
            <p>Essaie de valider plus d'aliments, ou reprends une autre photo.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + pantry.length * 0.06 + 0.2 }}>
            <h1 className={s.title}>{recipes.length} recette{recipes.length > 1 ? 's' : ''} avec ce que tu as</h1>

            <div className={s.tabs} role="group" aria-label="Choisir une recette">
              {recipes.map((r, i) => (
                <button key={r.recipe_id} type="button" className={s.tab}
                  aria-pressed={i === selected} onClick={() => setSelected(i)}>
                  {r.image_url && !failedThumbnailIds.has(r.recipe_id) && (
                    <img
                      className={s.tabThumb}
                      src={r.image_url}
                      alt=""
                      onError={() => {
                        setFailedThumbnailIds((current) => {
                          const next = new Set(current)
                          next.add(r.recipe_id)
                          return next
                        })
                      }}
                    />
                  )}
                  <span className={s.tabText}>
                    <span className={s.tabNum}>Recette {i + 1} </span>
                    <span className={s.tabTitle}>{r.title} </span>
                    <span className={s.muted}>
                      {r.preparation_time_minutes ? `${r.preparation_time_minutes} min · ` : ''}
                      utilise {r.ingredients.filter((ingredient) => ingredient.available).length} de tes aliments
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={recipe.recipe_id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}>
                <RecipeSheet recipe={recipe} decisions={decisions} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </section>
      <div className={s.tableEdge} aria-hidden="true" />

      <div className={s.footer}>
        <button type="button" className={s.secondary} onClick={() => dispatch({ type: 'backToReview' })}>Retour aux aliments</button>
        <button type="button" className={s.primary} onClick={() => dispatch({ type: 'reset' })}>Nouvelle photo</button>
      </div>
    </main>
  )
}
