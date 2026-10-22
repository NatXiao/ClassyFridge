import type { Analysis, Recipe } from './client'

type RecipeInput = Omit<Recipe, 'image_url'>

const recipe = (r: RecipeInput): Recipe => {
  return {
    ...r,
    image_url: null,
  }
}
// Simulate network latency so loading states remain visible.
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Compact list of ingredients and their detected instance counts.
const DETECTED: [name: string, count: number, confidence: number][] = [
  ['tomato', 3, 0.94],
  ['egg', 6, 0.97],
  ['bell pepper', 1, 0.81],
  ['onion', 2, 0.88],
  ['carrot', 4, 0.92],
  ['lemon', 1, 0.9],
  ['zucchini', 2, 0.76],
  ['cheese', 1, 0.7],
  ['apple', 1, 0.52], // Intentionally uncertain to test the rejection flow.
]

export async function mockAnalysis(): Promise<Analysis> {
  await delay(1200)

  // Always return one item per instance: 3 tomatoes = 3 items.
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
    recipe({
      recipe_id: 'mock-1',
      title: 'Shakshuka express',
      servings: 2,
      preparation_time_minutes: 25,
      ingredients: [
        { name: 'tomato', amount: 3, unit: '', original: '3 tomatoes, diced', available: true },
        { name: 'egg', amount: 4, unit: '', original: '4 eggs', available: true },
        { name: 'bell pepper', amount: 1, unit: '', original: '1 red bell pepper', available: true },
        { name: 'onion', amount: 1, unit: '', original: '1 onion', available: true },
        { name: 'olive oil', amount: 1, unit: 'tbsp', original: '1 tbsp olive oil', available: false },
        { name: 'cumin', amount: 1, unit: 'tsp', original: '1 tsp ground cumin', available: false },
      ],
      instructions: [
        'Slice the onion and pepper, cook for 5 minutes in olive oil.',
        'Add the diced tomatoes and cumin, simmer for 10 minutes.',
        'Make 4 wells and crack an egg into each.',
        'Cover and cook 5 to 7 minutes until the whites are set.',
      ],
    }),
    recipe({
      recipe_id: 'mock-2',
      title: 'Zucchini & Cheese Omelette',
      servings: 1,
      preparation_time_minutes: 15,
      ingredients: [
        { name: 'egg', amount: 3, unit: '', original: '3 eggs', available: true },
        { name: 'zucchini', amount: 1, unit: '', original: '1 small zucchini, grated', available: true },
        { name: 'cheese', amount: 40, unit: 'g', original: '40 g grated cheese', available: true },
        { name: 'butter', amount: 10, unit: 'g', original: '10 g butter', available: false },
      ],
      instructions: [
        'Grate the zucchini and squeeze out the water.',
        'Cook it in butter for 3 minutes.',
        'Pour in the beaten eggs, sprinkle with cheese and fold.',
      ],
    }),
    recipe({
      recipe_id: 'mock-3',
      title: 'Lemon Roasted Carrots',
      servings: 4,
      preparation_time_minutes: 35,
      ingredients: [
        { name: 'carrot', amount: 6, unit: '', original: '6 carrots, cut into sticks', available: true },
        { name: 'onion', amount: 1, unit: '', original: '1 onion, quartered', available: true },
        { name: 'lemon', amount: 0.5, unit: '', original: '1/2 lemon, juiced', available: true },
        { name: 'honey', amount: 1, unit: 'tbsp', original: '1 tbsp honey', available: false },
      ],
      instructions: [
        'Preheat the oven to 200 °C.',
        'Toss the vegetables with honey and oil, roast 25 minutes.',
        'Drizzle with lemon juice before serving.',
      ],
    }),
  ]
}
