import { useState, type Dispatch } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowDown } from 'lucide-react'
import {
  DEFAULT_RECIPE_OPTIONS,
  suggestRecipes,
  classifyImage,
  type Analysis,
  type RecipeOptions,
} from '../api/client'
import { enqueue } from '../api/queue'
import { confirmedStock, type Decision, type FlowAction } from '../state/flow'
import { Door } from '../components/Door'
import { Fridge } from '../components/Fridge'
import { Deck } from '../components/Deck'
import { AddIngredient } from '../components/AddIngredient'
import { RetakeDialog } from '../components/RetakeDialog'
import s from './ReviewScreen.module.css'

type Props = {
  analysis: Analysis
  decisions: Record<string, Decision>
  dispatch: Dispatch<FlowAction>
}

const SHELF_SIZE = 4
type RecipeOptionInputs = Record<keyof RecipeOptions, string>

export function ReviewScreen({ decisions, dispatch }: Props) {
  const [retakeId, setRetakeId] = useState<string | null>(null)

  /* --- Recipe preferences (#16) ------------------------------------------- */

  const [recipeOptionInputs, setRecipeOptionInputs] = useState<RecipeOptionInputs>({
    max_missing_ingredients: String(DEFAULT_RECIPE_OPTIONS.max_missing_ingredients),
    min_used_ingredients: String(DEFAULT_RECIPE_OPTIONS.min_used_ingredients),
    limit: String(DEFAULT_RECIPE_OPTIONS.limit),
  })

  const updateRecipeOption = (option: keyof RecipeOptions, value: string) => {
    setRecipeOptionInputs((current) => ({ ...current, [option]: value }))
  }

  const recipeOptions: RecipeOptions = {
    max_missing_ingredients: Number(recipeOptionInputs.max_missing_ingredients),
    min_used_ingredients: Number(recipeOptionInputs.min_used_ingredients),
    limit: Number(recipeOptionInputs.limit),
  }

  const recipeOptionsAreValid =
    recipeOptionInputs.max_missing_ingredients !== ''
    && recipeOptionInputs.min_used_ingredients !== ''
    && recipeOptionInputs.limit !== ''
    && Number.isInteger(recipeOptions.max_missing_ingredients)
    && Number.isInteger(recipeOptions.min_used_ingredients)
    && Number.isInteger(recipeOptions.limit)
    && recipeOptions.max_missing_ingredients >= 0
    && recipeOptions.max_missing_ingredients <= 20
    && recipeOptions.min_used_ingredients >= 1
    && recipeOptions.min_used_ingredients <= 20
    && recipeOptions.limit >= 1
    && recipeOptions.limit <= 20

  /* --- Cards: one deck per group ------------------------------------------ */

  // Crops of the same food are stacked, manual items stand alone
  const decks = new Map<string, Decision[]>()
  for (const d of Object.values(decisions)) decks.set(d.group, [...(decks.get(d.group) ?? []), d])
  const slots = [...decks.values()]
  const shelves = Array.from({ length: Math.ceil(slots.length / SHELF_SIZE) }, (_, i) =>
    slots.slice(i * SHELF_SIZE, (i + 1) * SHELF_SIZE),
  )

  const all = Object.values(decisions)
  const yes = all.filter((d) => d.status === 'yes').length
  const no = all.filter((d) => d.status === 'no').length
  const pending = all.length - yes - no
  const waiting = all.filter((d) => d.classifying).length
  const canContinue = pending === 0 && yes > 0

  // Retake photo: show the new picture right away, classify it through the queue
  const retake = (id: string, file: File) => {
    dispatch({ type: 'retake', id, crop: URL.createObjectURL(file) })
    enqueue(() => classifyImage(file))
      .then((r) => dispatch({ type: 'classified', id, candidates: r.predictions }))
      .catch((e: Error) => dispatch({ type: 'classifyFailed', id, error: e.message }))
  }

  const recipes = useMutation({
    mutationFn: () =>
      suggestRecipes(
        confirmedStock(decisions).map((d) => ({
          ingredient_name: d.name,
          instance_count: Math.max(1, Math.round(d.qty)),
        })),
        recipeOptions,
      ),
    onSuccess: (result) => dispatch({ type: 'recipesReady', recipes: result }),
  })

  return (
    <main className={s.layout}>
      <div className={s.intro}>
        <p className={s.kicker}>Step 2 of 3</p>
        <h1 className={s.title}>Here's what we put away.</h1>
        <p className={s.lead}>
          Check every item. Say no and we'll suggest the next guess. Anything you discard won't be used for recipes.
        </p>
      </div>

      <div className={s.split}>
        <div className={s.fridge}>
          <Fridge door={false}>
            {shelves.map((shelf, si) => (
              <div key={si} className={s.shelf}>
                <ul className={s.grid}>
                  {shelf.map((cards, ci) => (
                    <Deck
                      key={cards[0].group}
                      cards={cards}
                      index={si * SHELF_SIZE + ci}
                      dispatch={dispatch}
                      onRetake={setRetakeId}
                    />
                  ))}
                </ul>
                <div className={s.glass} aria-hidden="true" />
              </div>
            ))}
            <AddIngredient onAdd={(name, qty, unit) => dispatch({ type: 'add', name, qty, unit })} />
          </Fridge>
        </div>

        <Door>
          <aside aria-label="Summary" className={s.recap}>
            <h2 className={s.recapTitle}>Summary</h2>
            <p className={s.stat}><span>Confirmed</span><strong className={s.yes}>{yes}</strong></p>
            <p className={s.stat}><span>Discarded</span><strong className={s.no}>{no}</strong></p>
            <p className={s.stat}><span>To check</span><strong>{pending}</strong></p>

            <div className={s.recipeOptions}>
              <h3>Recipe preferences</h3>
              <label>
                <span>Maximum missing ingredients</span>
                <input type="number" min="0" max="20"
                  value={recipeOptionInputs.max_missing_ingredients}
                  onChange={(e) => updateRecipeOption('max_missing_ingredients', e.target.value)} />
              </label>
              <label>
                <span>Minimum of your ingredients used</span>
                <input type="number" min="1" max="20"
                  value={recipeOptionInputs.min_used_ingredients}
                  onChange={(e) => updateRecipeOption('min_used_ingredients', e.target.value)} />
              </label>
              <label>
                <span>Number of recipes</span>
                <input type="number" min="1" max="20"
                  value={recipeOptionInputs.limit}
                  onChange={(e) => updateRecipeOption('limit', e.target.value)} />
              </label>
            </div>

            <div className={s.ctaZone}>
              <button type="button" className={s.cta}
                disabled={!canContinue || !recipeOptionsAreValid || recipes.isPending}
                onClick={() => recipes.mutate()}>
                {recipes.isPending
                  ? 'Finding recipes…'
                  : recipeOptionsAreValid
                    ? `See ${recipeOptions.limit} recipe${recipeOptions.limit !== 1 ? 's' : ''}`
                    : 'Enter valid preferences'}{' '}
                <ArrowDown size={18} />
              </button>
              {!canContinue && (
                <p className={s.hint}>
                  {waiting > 0
                    ? `Waiting for the model (${waiting})…`
                    : pending > 0
                      ? `${pending} item${pending > 1 ? 's' : ''} left to check`
                      : 'Confirm at least one item'}
                </p>
              )}
              {canContinue && !recipeOptionsAreValid && (
                <p className={s.hint}>Enter values within the displayed ranges.</p>
              )}
              {recipes.isError && <p className={s.error}>{recipes.error.message}</p>}
              <button type="button" className={s.link} onClick={() => dispatch({ type: 'reset' })}>Change photo</button>
            </div>
          </aside>
        </Door>
      </div>

      <RetakeDialog
        open={retakeId !== null}
        onClose={() => setRetakeId(null)}
        onFile={(file) => retakeId && retake(retakeId, file)}
      />
    </main>
  )
}
