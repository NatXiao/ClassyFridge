import type { Analysis, Recipe } from './client'

// Simule la latence réseau, pour voir les états de chargement
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Liste compacte : un aliment et son nombre d'instances détectées
const DETECTED: [name: string, count: number, confidence: number][] = [
  ['tomato', 3, 0.94],
  ['egg', 6, 0.97],
  ['bell pepper', 1, 0.81],
  ['onion', 2, 0.88],
  ['carrot', 4, 0.92],
  ['lemon', 1, 0.9],
  ['zucchini', 2, 0.76],
  ['cheese', 1, 0.7],
  ['apple', 1, 0.52], // mal détecté exprès, pour tester le bouton "Non"
]

export async function mockAnalysis(): Promise<Analysis> {
  await delay(1200)

  // Toujours UN item par instance : 3 tomates = 3 items
  let nextId = 0
  const items: Analysis['items'] = DETECTED.flatMap(([name, count, confidence]) =>
    Array.from({ length: count }, () => ({
      item_id: nextId++,
      ingredient_name: name,
      confidence,
    })),
  )

  return {
    items,
    ingredients: DETECTED.map(([ingredient_name, instance_count]) => ({
      ingredient_name,
      instance_count,
    })),
  }
}

export async function mockRecipes(): Promise<Recipe[]> {
  await delay(800)
  return [
    {
      recipe_id: 'mock-1',
      title: 'Shakshuka express',
      required_ingredients: ['tomato', 'egg', 'bell pepper', 'onion', 'olive oil', 'cumin'],
      available_ingredients: ['tomato', 'egg', 'bell pepper', 'onion'],
      missing_ingredients: ['olive oil', 'cumin'],
      instructions: [
        "Émince l'oignon et le poivron, fais-les revenir 5 min.",
        'Ajoute les tomates en dés et le cumin, laisse compoter 10 min.',
        'Creuse 4 puits et casse un œuf dans chacun.',
        'Couvre et cuis 5 à 7 min.',
      ],
      preparation_time_minutes: 25,
    },
    {
      recipe_id: 'mock-2',
      title: 'Omelette courgette-fromage',
      required_ingredients: ['egg', 'zucchini', 'cheese', 'onion', 'butter'],
      available_ingredients: ['egg', 'zucchini', 'cheese', 'onion'],
      missing_ingredients: ['butter'],
      instructions: [
        'Râpe la courgette et presse-la pour retirer l\u2019eau.',
        'Fais revenir l\u2019oignon puis la courgette dans le beurre.',
        'Verse les œufs battus, parsème de fromage, plie l\u2019omelette.',
      ],
      preparation_time_minutes: 15,
    },
    {
      recipe_id: 'mock-3',
      title: 'Carottes rôties au citron',
      required_ingredients: ['carrot', 'onion', 'lemon', 'olive oil', 'honey'],
      available_ingredients: ['carrot', 'onion', 'lemon'],
      missing_ingredients: ['olive oil', 'honey'],
      instructions: [
        'Préchauffe le four à 200 °C.',
        'Coupe les carottes en bâtonnets, l\u2019oignon en quartiers.',
        'Mélange avec huile et miel, enfourne 25 min.',
        'Arrose de jus de citron à la sortie.',
      ],
      preparation_time_minutes: 35,
    },
  ]
}