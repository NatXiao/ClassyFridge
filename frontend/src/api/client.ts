import createClient from 'openapi-fetch'
import type { paths, components } from './schema'
import { mockAnalysis, mockRecipes } from './mocks'

export const api = createClient<paths>({ baseUrl: '/' })

export type Analysis = components['schemas']['AnalysisResponse']
export type IngredientCount = components['schemas']['IngredientCount']
export type Recipe = components['schemas']['Recipe']
export type RecipeIngredient = components['schemas']['RecipeIngredient']
export type Prediction = components['schemas']['Prediction']
export type Classification = components['schemas']['ClassificationResponse']

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

// Upload en multipart : un fetch simple est plus lisible qu'openapi-fetch ici
export async function analyzeImage(file: File): Promise<Analysis> {
  if (USE_MOCKS) return mockAnalysis()
  const body = new FormData()
  body.append('image', file)
  const res = await fetch('/api/v1/analyses', { method: 'POST', body })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function suggestRecipes(ingredients: IngredientCount[]): Promise<Recipe[]> {
  if (USE_MOCKS) return mockRecipes()
  const { data, error } = await api.POST('/api/v1/recipes/suggestions', { body: { ingredients } })
  if (error) throw new Error(String((error as { detail?: string }).detail))
  return data.recipes
}

// Retake photo: the picture goes straight to the classifier
export async function classifyImage(file: File): Promise<Classification> {
  if (USE_MOCKS) return mockClassify()
  const body = new FormData()
  body.append('image', file)
  const res = await fetch('/api/v1/classifications', { method: 'POST', body })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}