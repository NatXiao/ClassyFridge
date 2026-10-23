import type { Analysis } from './client'

// Aliments que le modèle ne voit pas forcément, avec le nom attendu par Spoonacular
export const SUGGESTIONS: [fr: string, en: string][] = [
  ['Viande hachée', 'ground beef'], ['Steak de bœuf', 'beef steak'], ['Poulet', 'chicken breast'],
  ['Lardons', 'bacon'], ['Jambon', 'ham'], ['Saumon', 'salmon'], ['Thon', 'tuna'],
  ['Riz', 'rice'], ['Pâtes', 'pasta'], ['Pommes de terre', 'potato'], ['Lait', 'milk'],
  ['Beurre', 'butter'], ['Crème', 'cream'], ['Farine', 'flour'], ['Ail', 'garlic'],
  ['Huile d\u2019olive', 'olive oil'], ['Miel', 'honey'],
]

const FR: Record<string, string> = {
  tomato: 'Tomate', egg: 'Œuf', 'bell pepper': 'Poivron', onion: 'Oignon',
  carrot: 'Carotte', lemon: 'Citron', zucchini: 'Courgette', cheese: 'Fromage',
  apple: 'Pomme', mushroom: 'Champignon',
  ...Object.fromEntries(SUGGESTIONS.map(([fr, en]) => [en, fr])),
}

export const label = (name: string) => {
  const text = name.replace(/_/g, ' ')
  return FR[name] ?? text.charAt(0).toUpperCase() + text.slice(1)
}

// "Poulet" → "chicken breast", "Tomate" → "tomato" ; un nom inconnu part tel quel
export function toEnglish(input: string) {
  const t = input.trim().toLowerCase()
  const hit = Object.entries(FR).find(([, fr]) => fr.toLowerCase() === t)
  return hit ? hit[0] : t
}

export function cropSrc(
  item: Analysis['items'][number] | undefined,
): string | undefined {
  return item?.image_url ?? undefined
}
