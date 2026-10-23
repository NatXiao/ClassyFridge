import createClient from 'openapi-fetch'
import type { paths, components } from './schema'
import { mockAnalysis, mockClassify, mockRecipes } from './mocks'

export const api = createClient<paths>({ baseUrl: '/' })

export type Analysis = components['schemas']['AnalysisResponse']
export type DetectedIngredient = components['schemas']['DetectedIngredient']
export type IngredientCount = components['schemas']['IngredientCount']
export type Recipe = components['schemas']['Recipe']
export type RecipeIngredient = components['schemas']['RecipeIngredient']
export type Prediction = {
  ingredient_name: string
  confidence: number
}
export type RecipeOptions = {
  max_missing_ingredients: number
  min_used_ingredients: number
  limit: number
}

export const DEFAULT_RECIPE_OPTIONS: RecipeOptions = {
  max_missing_ingredients: 6,
  min_used_ingredients: 2,
  limit: 3,
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export function predictionMapToList(
  predictions: Record<string, number>,
): Prediction[] {
  return Object.entries(predictions).map(
    ([ingredient_name, confidence]) => ({
      ingredient_name,
      confidence,
    }),
  )
}

// Upload en multipart : un fetch simple est plus lisible qu'openapi-fetch ici
export async function analyzeImage(file: File): Promise<Analysis> {
  if (USE_MOCKS) return mockAnalysis()
  const body = new FormData()
  body.append('image', file)
  const res = await fetch('/api/v1/analyses', { method: 'POST', body })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function suggestRecipes(
  ingredients: IngredientCount[],
  options: RecipeOptions = DEFAULT_RECIPE_OPTIONS,
): Promise<Recipe[]> {
  if (USE_MOCKS) return mockRecipes()
  const { data, error } = await api.POST('/api/v1/recipes/suggestions', {
    body: { ingredients, ...options },
  })
  if (error) throw new Error(String((error as { detail?: string }).detail))
  return data.recipes
}

// Retake photo: reclassify one existing detection without segmenting it again.
export async function reclassifyImage(
  itemId: string,
  file: File,
): Promise<DetectedIngredient> {
  if (USE_MOCKS) {
    const predictions = await mockClassify([])
    const firstPrediction = predictions[0]

    if (!firstPrediction) {
      throw new Error('The model returned no predictions.')
    }

    return {
      item_id: Number(itemId),
      ingredient_name: firstPrediction.ingredient_name,
      confidence: firstPrediction.confidence,
      image_url: null,
      predictions: Object.fromEntries(
        predictions.map(({ ingredient_name, confidence }) => [
          ingredient_name,
          confidence,
        ]),
      ),
      is_poisonous: false,
    }
  }

  const body = new FormData()
  body.append('image', file)
  const query = new URLSearchParams({ old_prediction_index: itemId })
  const res = await fetch(`/api/v1/reclassify?${query}`, {
    method: 'POST',
    body,
  })

  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}
