import { useState, type Dispatch } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowDown } from 'lucide-react'

import {
  DEFAULT_RECIPE_OPTIONS,
  predictionMapToList,
  reclassifyImage,
  suggestRecipes,
  type Analysis,
  type RecipeOptions,
} from '../api/client'
import { enqueue } from '../api/queue'
import { AddIngredient } from '../components/AddIngredient'
import { Deck } from '../components/Deck'
import { Door } from '../components/Door'
import { Fridge } from '../components/Fridge'
import { RetakeDialog } from '../components/RetakeDialog'
import {
  confirmedStock,
  type Decision,
  type FlowAction,
} from '../state/flow'
import s from './ReviewScreen.module.css'

type Props = {
  analysis: Analysis
  decisions: Record<string, Decision>
  dispatch: Dispatch<FlowAction>
}

const SHELF_SIZE = 4

const isMushroom = (name: string) => {
  const normalized = name.trim().toLowerCase()
  return normalized === 'mushroom' || normalized === 'mushrooms'
}

type RecipeOptionInputs = Record<keyof RecipeOptions, string>

export function ReviewScreen({ decisions, dispatch }: Props) {
  const [retakeId, setRetakeId] = useState<string | null>(null)

  const [recipeOptionInputs, setRecipeOptionInputs] =
    useState<RecipeOptionInputs>({
      max_missing_ingredients: String(
        DEFAULT_RECIPE_OPTIONS.max_missing_ingredients,
      ),
      min_used_ingredients: String(
        DEFAULT_RECIPE_OPTIONS.min_used_ingredients,
      ),
      limit: String(DEFAULT_RECIPE_OPTIONS.limit),
    })

  const updateRecipeOption = (
    option: keyof RecipeOptions,
    value: string,
  ) => {
    setRecipeOptionInputs((current) => ({
      ...current,
      [option]: value,
    }))
  }

  const recipeOptions: RecipeOptions = {
    max_missing_ingredients: Number(
      recipeOptionInputs.max_missing_ingredients,
    ),
    min_used_ingredients: Number(
      recipeOptionInputs.min_used_ingredients,
    ),
    limit: Number(recipeOptionInputs.limit),
  }

  const recipeOptionsAreValid = (
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
  )

  // Crops of the same detected ingredient are displayed as one deck.
  // Manually added ingredients each get their own deck.
  const decks = new Map<string, Decision[]>()

  for (const decision of Object.values(decisions)) {
    decks.set(decision.group, [
      ...(decks.get(decision.group) ?? []),
      decision,
    ])
  }

  for (const cards of decks.values()) {
    cards.sort(
      (first, second) =>
        (first.pilePriority ?? 0) - (second.pilePriority ?? 0),
    )
  }

  const slots = [...decks.values()]

  const shelves = Array.from(
    { length: Math.ceil(slots.length / SHELF_SIZE) },
    (_, index) =>
      slots.slice(
        index * SHELF_SIZE,
        (index + 1) * SHELF_SIZE,
      ),
  )

  const allDecisions = Object.values(decisions)
  const confirmed = allDecisions.filter(
    (decision) => decision.status === 'yes',
  ).length
  const discarded = allDecisions.filter(
    (decision) => decision.status === 'no',
  ).length
  const pending = allDecisions.length - confirmed - discarded
  const waiting = allDecisions.filter(
    (decision) => decision.classifying,
  ).length

  const canContinue = pending === 0 && confirmed > 0

  const classifySelectedMushroom = (
    id: string,
    name: string,
    confirm: boolean,
  ) => {
    const decision = decisions[id]
    const crop = decision?.crop

    dispatch({
      type: 'mushroomClassificationStarted',
      id,
      name,
    })

    if (!crop) {
      dispatch({
        type: 'classifyFailed',
        id,
        error: 'No cropped image is available for mushroom classification.',
      })
      return
    }

    enqueue(async () => {
      const imageResponse = await fetch(crop)
      if (!imageResponse.ok) {
        throw new Error('Could not read the cropped image.')
      }

      const imageBlob = await imageResponse.blob()
      const imageFile = new File(
        [imageBlob],
        `ingredient-${id}.jpg`,
        { type: imageBlob.type || 'image/jpeg' },
      )

      return reclassifyImage(id, imageFile, name)
    })
      .then((response) => {
        dispatch({
          type: 'mushroomClassified',
          id,
          isPoisonous: response.is_poisonous,
          confirm,
        })
      })
      .catch((error: Error) => {
        dispatch({
          type: 'classifyFailed',
          id,
          error: error.message,
        })
      })
  }

  const selectIngredient = (id: string, name: string) => {
    if (isMushroom(name)) {
      classifySelectedMushroom(id, name, true)
      return
    }

    dispatch({ type: 'select', id, name })
  }

  const rejectIngredient = (decision: Decision) => {
    const nextCandidate = decision.candidates[decision.attempt + 1]

    dispatch({ type: 'reject', id: decision.id })

    if (nextCandidate && isMushroom(nextCandidate.ingredient_name)) {
      classifySelectedMushroom(
        decision.id,
        nextCandidate.ingredient_name,
        false,
      )
    }
  }

  // Show the replacement picture immediately and classify it in the queue.
  const retake = (id: string, file: File) => {
    dispatch({
      type: 'retake',
      id,
      crop: URL.createObjectURL(file),
    })

    enqueue(() => reclassifyImage(id, file))
      .then((response) => {
        dispatch({
          type: 'classified',
          id,
          candidates: predictionMapToList(response.predictions),
          isPoisonous: response.is_poisonous,
        })
      })
      .catch((error: Error) => {
        dispatch({
          type: 'classifyFailed',
          id,
          error: error.message,
        })
      })
  }

  const recipes = useMutation({
    mutationFn: () =>
      suggestRecipes(
        confirmedStock(decisions).map((decision) => ({
          ingredient_name: decision.name,
          instance_count: Math.max(
            1,
            Math.round(decision.qty),
          ),
        })),
        recipeOptions,
      ),
    onSuccess: (result) => {
      dispatch({
        type: 'recipesReady',
        recipes: result,
      })
    },
  })

  return (
    <main className={s.layout}>
      <div className={s.intro}>
        <p className={s.kicker}>Step 2 of 3</p>
        <h1 className={s.title}>Here&apos;s what we put away.</h1>
        <p className={s.lead}>
          Check every item. Say no and we&apos;ll suggest the next
          guess. Anything you discard won&apos;t be used for recipes.
        </p>
      </div>

      <div className={s.split}>
        <div className={s.fridge}>
          <Fridge door={false}>
            {shelves.map((shelf, shelfIndex) => (
              <div key={shelfIndex} className={s.shelf}>
                <ul className={s.grid}>
                  {shelf.map((cards, cardIndex) => (
                    <Deck
                      key={`${cards[0].group}:${cards[0].id}`}
                      cards={cards}
                      index={
                        shelfIndex * SHELF_SIZE + cardIndex
                      }
                      dispatch={dispatch}
                      onReject={rejectIngredient}
                      onSelect={selectIngredient}
                      onRetake={setRetakeId}
                    />
                  ))}
                </ul>

                <div className={s.glass} aria-hidden="true" />
              </div>
            ))}

            <AddIngredient
              onAdd={(name, qty, unit) => {
                dispatch({
                  type: 'add',
                  name,
                  qty,
                  unit,
                })
              }}
            />
          </Fridge>
        </div>

        <Door>
          <aside aria-label="Summary" className={s.recap}>
            <h2 className={s.recapTitle}>Summary</h2>

            <p className={s.stat}>
              <span>Confirmed</span>
              <strong className={s.yes}>{confirmed}</strong>
            </p>

            <p className={s.stat}>
              <span>Discarded</span>
              <strong className={s.no}>{discarded}</strong>
            </p>

            <p className={s.stat}>
              <span>To check</span>
              <strong>{pending}</strong>
            </p>

            <div className={s.recipeOptions}>
              <h3>Recipe preferences</h3>

              <label>
                <span>Maximum missing</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={
                    recipeOptionInputs.max_missing_ingredients
                  }
                  onChange={(event) => {
                    updateRecipeOption(
                      'max_missing_ingredients',
                      event.target.value,
                    )
                  }}
                />
              </label>

              <label>
                <span>Minimum used</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={
                    recipeOptionInputs.min_used_ingredients
                  }
                  onChange={(event) => {
                    updateRecipeOption(
                      'min_used_ingredients',
                      event.target.value,
                    )
                  }}
                />
              </label>

              <label>
                <span>Recipe limit</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={recipeOptionInputs.limit}
                  onChange={(event) => {
                    updateRecipeOption(
                      'limit',
                      event.target.value,
                    )
                  }}
                />
              </label>
            </div>

            <div className={s.ctaZone}>
              <button
                type="button"
                className={s.cta}
                disabled={
                  !canContinue
                  || !recipeOptionsAreValid
                  || recipes.isPending
                }
                onClick={() => recipes.mutate()}
              >
                {recipes.isPending
                  ? 'Searching…'
                  : `See ${recipeOptions.limit} recipe${
                    recipeOptions.limit !== 1 ? 's' : ''
                  }`}

                <ArrowDown size={18} />
              </button>

              {!canContinue && (
                <p className={s.hint}>
                  {waiting > 0
                    ? `Waiting for the model (${waiting})…`
                    : pending > 0
                      ? `${pending} item${
                        pending > 1 ? 's' : ''
                      } left to check`
                      : 'Confirm at least one item'}
                </p>
              )}

              {!recipeOptionsAreValid && (
                <p className={s.hint}>
                  Enter valid recipe preferences.
                </p>
              )}

              {recipes.isError && (
                <p className={s.error}>
                  {recipes.error.message}
                </p>
              )}

              <button
                type="button"
                className={s.link}
                onClick={() => dispatch({ type: 'reset' })}
              >
                Change photo
              </button>
            </div>
          </aside>
        </Door>
      </div>

      <RetakeDialog
        open={retakeId !== null}
        onClose={() => setRetakeId(null)}
        onFile={(file) => {
          if (retakeId !== null) {
            retake(retakeId, file)
          }
        }}
      />
    </main>
  )
}
