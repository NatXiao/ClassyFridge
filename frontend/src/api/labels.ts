import type { Analysis } from './client'

// Aliments que le modèle ne voit pas forcément, avec le nom attendu par Spoonacular
export const SUGGESTIONS = [
  'ground beef', 'beef steak', 'chicken breast', 'bacon', 'ham', 'salmon',
  'tuna', 'rice', 'pasta', 'potato', 'milk', 'butter', 'cream', 'flour',
  'garlic', 'olive oil', 'honey',
]

export const label = (name: string) => {
  const text = name.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function cropSrc(
  item: Analysis['items'][number] | undefined,
): string | undefined {
  return item?.image_url ?? undefined
}
