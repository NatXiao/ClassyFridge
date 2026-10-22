import { useState, type Dispatch } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowDown } from 'lucide-react'
import {
  DEFAULT_RECIPE_OPTIONS,
  suggestRecipes,
  type Analysis,
  type RecipeOptions,
} from '../api/client'
import { label, cropSrc } from '../api/labels'
import type { Decision, FlowAction } from '../state/flow'
import { Door } from '../components/Door'
import { Fridge } from '../components/Fridge'
import { FoodCard } from '../components/FoodCard'
import { AddIngredient } from '../components/AddIngredient'
import s from './ReviewScreen.module.css'

type Props = {
  analysis: Analysis
  decisions: Record<string, Decision>
  dispatch: Dispatch<FlowAction>
}

type RecipeOptionInputs = Record<keyof RecipeOptions, string>

const SHELF_SIZE = 4

export function ReviewScreen({
  analysis,
  decisions,
  dispatch,
}: Props) {
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

  // One card per detected ingredient, using its first cropped image.
  const detected = analysis.ingredients.map((ingredient) => {
    const items = analysis.items.filter(
      (item) =>
        item.ingredient_name === ingredient.ingredient_name,
    )

    return {
      name: ingredient.ingredient_name,
      crop: cropSrc(items[0]),
      unsure:
        Math.min(...items.map((item) => item.confidence)) < 0.6,
      manual: false,
    }
  })

  // Manually added ingredients appear after detected ingredients.
  const added = Object.entries(decisions)
    .filter(([, decision]) => decision.manual)
    .map(([name]) => ({
      name,
      crop: undefined,
      unsure: false,
      manual: true,
    }))

  const cards = [...detected, ...added]

  const shelves = Array.from(
    { length: Math.ceil(cards.length / SHELF_SIZE) },
    (_, index) =>
      cards.slice(
        index * SHELF_SIZE,
        (index + 1) * SHELF_SIZE,
      ),
  )

  const allDecisions = Object.values(decisions)
  const yes = allDecisions.filter(
    (decision) => decision.status === 'yes',
  ).length
  const no = allDecisions.filter(
    (decision) => decision.status === 'no',
  ).length
  const pending = allDecisions.length - yes - no
  const canContinue = pending === 0 && yes > 0

  const recipes = useMutation({
    mutationFn: () =>
      suggestRecipes(
        Object.entries(decisions)
          .filter(([, decision]) => decision.status === 'yes')
          .map(([ingredient_name, decision]) => ({
            ingredient_name,
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
        <h1 className={s.title}>Here's what we found.</h1>
        <p className={s.lead}>
          Review each ingredient and adjust its quantity if needed.
          Rejected ingredients won't be used for recipes.
        </p>
      </div>

      <div className={s.split}>
        <div className={s.fridge}>
          <Fridge door={false}>
            {shelves.map((shelf, shelfIndex) => (
              <div key={shelfIndex} className={s.shelf}>
                <ul className={s.grid}>
                  {shelf.map((card, cardIndex) => (
                    <FoodCard
                      key={card.name}
                      label={label(card.name)}
                      crop={card.crop}
                      unsure={card.unsure}
                      decision={decisions[card.name]}
                      index={
                        shelfIndex * SHELF_SIZE + cardIndex
                      }
                      onDecide={(decision) =>
                        dispatch({
                          type: 'decide',
                          name: card.name,
                          decision,
                        })
                      }
                      manual={card.manual}
                      onRemove={() =>
                        dispatch({
                          type: 'remove',
                          name: card.name,
                        })
                      }
                    />
                  ))}
                </ul>

                <div
                  className={s.glass}
                  aria-hidden="true"
                />
              </div>
            ))}

            <AddIngredient
              onAdd={(name, qty, unit) =>
                dispatch({
                  type: 'add',
                  name,
                  qty,
                  unit,
                })
              }
            />
          </Fridge>
        </div>

        <Door>
          <aside aria-label="Summary" className={s.recap}>
            <h2 className={s.recapTitle}>Summary</h2>

            <p className={s.stat}>
              <span>Approved</span>
              <strong className={s.yes}>{yes}</strong>
            </p>

            <p className={s.stat}>
              <span>Rejected</span>
              <strong className={s.no}>{no}</strong>
            </p>

            <p className={s.stat}>
              <span>To review</span>
              <strong>{pending}</strong>
            </p>

            <div className={s.recipeOptions}>
              <h3>Recipe preferences</h3>

              <label>
                <span>Maximum missing ingredients</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={
                    recipeOptionInputs.max_missing_ingredients
                  }
                  onChange={(event) =>
                    updateRecipeOption(
                      'max_missing_ingredients',
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Minimum of your ingredients used</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={
                    recipeOptionInputs.min_used_ingredients
                  }
                  onChange={(event) =>
                    updateRecipeOption(
                      'min_used_ingredients',
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Number of recipes</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={recipeOptionInputs.limit}
                  onChange={(event) =>
                    updateRecipeOption(
                      'limit',
                      event.target.value,
                    )
                  }
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
                  ? 'Finding recipes…'
                  : recipeOptionsAreValid
                    ? `See ${recipeOptions.limit} recipe${
                      recipeOptions.limit !== 1 ? 's' : ''
                    }`
                    : 'Enter valid preferences'}{' '}
                <ArrowDown size={18} />
              </button>

              {!canContinue && (
                <p className={s.hint}>
                  {pending > 0
                    ? `${pending} ingredient${
                      pending !== 1 ? 's' : ''
                    } left to review`
                    : 'Approve at least one ingredient'}
                </p>
              )}

              {canContinue && !recipeOptionsAreValid && (
                <p className={s.hint}>
                  Enter values within the displayed ranges.
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
                Choose another photo
              </button>
            </div>
          </aside>
        </Door>
      </div>
    </main>
  )
}