import type { Analysis } from './client'

export const INGREDIENT_SUGGESTIONS = [
  'ground beef',
  'beef steak',
  'chicken breast',
  'bacon',
  'ham',
  'salmon',
  'tuna',
  'rice',
  'pasta',
  'potato',
  'milk',
  'butter',
  'cream',
  'flour',
  'garlic',
  'olive oil',
  'honey',
]

export const label = (name: string) =>
  name.replace(/\b\w/g, (character) => character.toUpperCase())

export function cropSrc(item: Analysis['items'][number] | undefined) {
  return item?.image_url ?? undefined
}
