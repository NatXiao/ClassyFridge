import { useMutation } from '@tanstack/react-query'
import { ArrowDown } from 'lucide-react'
import { useState, type Dispatch } from 'react'

import {
  classifyImage,
  DEFAULT_RECIPE_OPTIONS,
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

  // Group crops of the same detected food into decks.
  // Manually added ingredients remain on their own.
  const decks = new Map<string, Decision[]>()

  for (const decision of Object.values(decisions)) {
    decks.set(decision.group, [
      ...(decks.get(decision.group) ?? []),
      decision,
    ])
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
  const pending = allDecisions.filter(
    (decision) => decision.status === null,
  ).length
  const confirmed = allDecisions.filter(
    (decision) => decision.status === 'yes',
  ).length
  const rejected = allDecisions.filter(
    (decision) => decision.status === 'no',
  ).length
  const classifying = allDecisions.filter(
    (decision) => decision.classifying,
  ).length

  const canContinue = (
    pending === 0
    && confirmed > 0
    && classifying === 0
  )

  const retake = (id: string, file: File) => {
    dispatch({
      type: 'retake',
      id,
      crop: URL.createObjectURL(file),
    })

    enqueue(() => classifyImage(file))
      .then((response) => {
        dispatch({
          type: 'classified',
          id,
          candidates: response.predictions,
          edible: response.edible,
        })
      })
      .catch(() => {
        dispatch({
          type: 'classified',
          id,
          candidates: [],
          edible: null,
        })
      })

    setRetakeId(null)
  }

  const recipes = useMutation({
    mutationFn: () =>
      suggestRecipes(
        confirmedStock(decisions).map(
          ([ingredient_name, decision]) => ({
            ingredient_name,
            instance_count: decision.qty,
          }),
        ),
        recipeOptions,
      ),
    onSuccess: (data) => {
      dispatch({
        type: 'recipes',
        recipes: data,
      })
    },
  })

  return (
    <main className={s.page}>
      <section className={s.intro}>
        <p className={s.step}>STEP 2 OF 3</p>
        <h1>Check what we found</h1>
        <p>
          Confirm the ingredients we detected, correct them if needed,
          and choose your recipe preferences.
        </p>
        <ArrowDown size={28} aria-hidden="true" />
      </section>

      <Fridge>
        {shelves.map((shelf, shelfIndex) => (
          <div className={s.shelf} key={shelfIndex}>
            {shelf.map((deck) => (
              <Deck
                key={deck[0].group}
                decisions={deck}
                dispatch={dispatch}
                onRetake={setRetakeId}
              />
            ))}
          </div>
        ))}

        <AddIngredient
          onAdd={(ingredientName) => {
            dispatch({
              type: 'add',
              name: ingredientName,
            })
          }}
        />

        <Door />
      </Fridge>

      <section className={s.summary}>
        <p>
          <strong>{confirmed}</strong> confirmed
          {' · '}
          <strong>{rejected}</strong> removed
          {' · '}
          <strong>{pending}</strong> left to review
        </p>
      </section>

      <section className={s.recipeOptions}>
        <h2>Recipe preferences</h2>

        <div className={s.optionFields}>
          <label>
            Maximum missing ingredients
            <input
              type="number"
              min="0"
              max="20"
              value={recipeOptionInputs.max_missing_ingredients}
              onChange={(event) =>
                updateRecipeOption(
                  'max_missing_ingredients',
                  event.target.value,
                )}
            />
          </label>

          <label>
            Minimum ingredients used
            <input
              type="number"
              min="1"
              max="20"
              value={recipeOptionInputs.min_used_ingredients}
              onChange={(event) =>
                updateRecipeOption(
                  'min_used_ingredients',
                  event.target.value,
                )}
            />
          </label>

          <label>
            Number of recipes
            <input
              type="number"
              min="1"
              max="20"
              value={recipeOptionInputs.limit}
              onChange={(event) =>
                updateRecipeOption(
                  'limit',
                  event.target.value,
                )}
            />
          </label>
        </div>
      </section>

      <section className={s.continue}>
        <button
          type="button"
          disabled={
            !canContinue
            || !recipeOptionsAreValid
            || recipes.isPending
          }
          onClick={() => recipes.mutate()}
        >
          {recipes.isPending ? 'Finding recipes…' : 'Find recipes'}
        </button>

        {classifying > 0 && (
          <p>
            Classifying {classifying} image
            {classifying !== 1 ? 's' : ''}…
          </p>
        )}

        {pending > 0 && classifying === 0 && (
          <p>
            Review {pending} remaining ingredient
            {pending !== 1 ? 's' : ''} to continue.
          </p>
        )}

        {!recipeOptionsAreValid && (
          <p>Please enter valid recipe preferences.</p>
        )}

        {recipes.isError && (
          <p>Could not retrieve recipes. Please try again.</p>
        )}
      </section>

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