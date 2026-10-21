import { useState, type Dispatch } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowDown, Check, Plus, Clock } from 'lucide-react'
import type { Recipe } from '../api/client'
import { label } from '../api/labels'
import type { Decision, FlowAction } from '../state/flow'
import s from './RecipesScreen.module.css'

type Props = {
  recipes: Recipe[]
  decisions: Record<string, Decision>
  dispatch: Dispatch<FlowAction>
}

export function RecipesScreen({ recipes, decisions, dispatch }: Props) {
  const [selected, setSelected] = useState(0)
  const pantry = Object.entries(decisions).filter(([, d]) => d.status === 'yes')
  const recipe = recipes[selected]

  return (
    <main className={s.layout}>
      <div className={s.fridgeBottom}>
        <span>Étagères vides — <strong>{pantry.length} aliments</strong> sont descendus sur la table</span>
        <button type="button" className={s.link} onClick={() => dispatch({ type: 'backToReview' })}>Modifier</button>
      </div>

      <motion.div className={s.arrow} aria-hidden="true"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <ArrowDown size={22} />
      </motion.div>

      <section className={s.table} aria-label="La table">
        <ul className={s.pantry} aria-label="Aliments validés">
          {pantry.map(([name, d], i) => (
            <motion.li key={name} className={s.chip}
              initial={{ opacity: 0, y: -160 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 220, damping: 20 }}>
              <span className={s.chipDot} aria-hidden="true" />
              {label(name)} <span className={s.muted}>×{d.qty}</span>
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
                  <span className={s.tabNum}>Recette {i + 1}</span>
                  <span className={s.tabTitle}>{r.title}</span>
                  <span className={s.muted}>
                    {r.preparation_time_minutes ? `${r.preparation_time_minutes} min · ` : ''}
                    utilise {r.available_ingredients.length} de tes aliments
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.article key={recipe.recipe_id} className={s.sheet}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}>
                <header className={s.sheetHead}>
                  <h2 className={s.sheetTitle}>{recipe.title}</h2>
                  {recipe.preparation_time_minutes && (
                    <span className={s.pill}><Clock size={16} /> {recipe.preparation_time_minutes} min</span>
                  )}
                </header>

                <div className={s.columns}>
                  <section className={s.ingredients} aria-label="Ingrédients">
                    <h3>Ingrédients</h3>
                    <p className={s.groupYes}>Dans ton frigo</p>
                    <ul className={s.list}>
                      {recipe.available_ingredients.map((name) => (
                        <li key={name}>
                          <span className={s.iconYes}><Check size={14} strokeWidth={3} /></span>
                          <span className={s.ingName}>{label(name)}</span>
                          {decisions[name] && <span className={s.muted}>tu en as {decisions[name].qty}</span>}
                        </li>
                      ))}
                    </ul>
                    {recipe.missing_ingredients.length > 0 && (
                      <>
                        <p className={s.groupMissing}>À ajouter</p>
                        <ul className={s.list}>
                          {recipe.missing_ingredients.map((name) => (
                            <li key={name}>
                              <span className={s.iconMissing}><Plus size={14} strokeWidth={3} /></span>
                              {label(name)}
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
                        <li key={i}><span className={s.stepNum}>{i + 1}</span><p>{step}</p></li>
                      ))}
                    </ol>
                  </section>
                </div>
              </motion.article>
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
