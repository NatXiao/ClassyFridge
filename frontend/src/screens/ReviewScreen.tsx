import type { Dispatch } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Door } from '../components/Door'
import { ArrowDown } from 'lucide-react'
import { suggestRecipes, type Analysis } from '../api/client'
import { label, cropSrc } from '../api/labels'
import type { Decision, FlowAction } from '../state/flow'
import { Fridge } from '../components/Fridge'
import { FoodCard } from '../components/FoodCard'
import s from './ReviewScreen.module.css'

type Props = {
  analysis: Analysis
  decisions: Record<string, Decision>
  dispatch: Dispatch<FlowAction>
}

const SHELF_SIZE = 4

export function ReviewScreen({ analysis, decisions, dispatch }: Props) {
  // Une carte par ingrédient, avec le crop de sa première instance
  const cards = analysis.ingredients.map((ing) => {
    const items = analysis.items.filter((i) => i.ingredient_name === ing.ingredient_name)
    return {
      name: ing.ingredient_name,
      crop: cropSrc(items[0]),
      unsure: Math.min(...items.map((i) => i.confidence)) < 0.6,
    }
  })
  const shelves = Array.from({ length: Math.ceil(cards.length / SHELF_SIZE) }, (_, i) =>
    cards.slice(i * SHELF_SIZE, (i + 1) * SHELF_SIZE),
  )

  const all = Object.values(decisions)
  const yes = all.filter((d) => d.status === 'yes').length
  const no = all.filter((d) => d.status === 'no').length
  const pending = all.length - yes - no
  const canContinue = pending === 0 && yes > 0

  const recipes = useMutation({
    mutationFn: () =>
      suggestRecipes(
        Object.entries(decisions)
          .filter(([, d]) => d.status === 'yes')
          .map(([ingredient_name, d]) => ({ ingredient_name, instance_count: d.qty })),
      ),
    onSuccess: (result) => dispatch({ type: 'recipesReady', recipes: result }),
  })

  return (
    <main className={s.layout}>
      <div className={s.intro}>
        <p className={s.kicker}>Étape 2 sur 3</p>
        <h1 className={s.title}>Voilà ce qu'on a rangé.</h1>
        <p className={s.lead}>Vérifie chaque aliment et corrige la quantité si besoin. Ce que tu refuses ne sera pas utilisé pour les recettes.</p>
      </div>

      <div className={s.split}>
        <div className={s.fridge}>
          <Fridge door={false}>
            {shelves.map((shelf, si) => (
              <div key={si} className={s.shelf}>
                <ul className={s.grid}>
                  {shelf.map((c, ci) => (
                    <FoodCard
                      key={c.name}
                      label={label(c.name)}
                      crop={c.crop}
                      unsure={c.unsure}
                      decision={decisions[c.name]}
                      index={si * SHELF_SIZE + ci}
                      onDecide={(d) => dispatch({ type: 'decide', name: c.name, decision: d })}
                    />
                  ))}
                </ul>
                <div className={s.glass} aria-hidden="true" />
              </div>
            ))}
          </Fridge>
        </div>

        <Door>
          <aside aria-label="Récapitulatif" className={s.recap}>
            <h2 className={s.recapTitle}>Récap</h2>
            <p className={s.stat}><span>Validés</span><strong className={s.yes}>{yes}</strong></p>
            <p className={s.stat}><span>Refusés</span><strong className={s.no}>{no}</strong></p>
            <p className={s.stat}><span>À vérifier</span><strong>{pending}</strong></p>

            <div className={s.ctaZone}>
              <button type="button" className={s.cta} disabled={!canContinue || recipes.isPending} onClick={() => recipes.mutate()}>
                {recipes.isPending ? 'On cherche…' : 'Voir les 3 recettes'} <ArrowDown size={18} />
              </button>
              {!canContinue && (
                <p className={s.hint}>
                  {pending > 0 ? `Encore ${pending} aliment${pending > 1 ? 's' : ''} à vérifier` : 'Valide au moins un aliment'}
                </p>
              )}
              {recipes.isError && <p className={s.error}>{recipes.error.message}</p>}
              <button type="button" className={s.link} onClick={() => dispatch({ type: 'reset' })}>Changer de photo</button>
            </div>
          </aside>
        </Door>
      </div>
    </main>
  )
}
