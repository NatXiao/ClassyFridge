const FRACTIONS: [number, string][] = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [0.75, '¾']]

export function formatAmount(n: number, unit: string) {
  if (n <= 0) return ''
  const u = unit
  // Grams and millilitres are easier to read as whole numbers.
  if (['g', 'ml', 'kg', 'l'].includes(u)) return `${Math.round(n)} ${u}`
  const whole = Math.floor(n)
  const rest = n - whole
  const frac = FRACTIONS.find(([v]) => Math.abs(v - rest) < 0.06)?.[1]
  const num = frac ? `${whole || ''}${frac}` : String(Math.round(n * 10) / 10)
  return u ? `${num} ${u}` : num
}
type Kind = 'count' | 'mass' | 'volume'

const BASE: Record<string, [Kind, number]> = {
  '': ['count', 1], large: ['count', 1], medium: ['count', 1], small: ['count', 1],
  whole: ['count', 1], piece: ['count', 1], pieces: ['count', 1],
  g: ['mass', 1], gram: ['mass', 1], grams: ['mass', 1], kg: ['mass', 1000],
  oz: ['mass', 28.35], ounce: ['mass', 28.35], ounces: ['mass', 28.35],
  lb: ['mass', 453.6], lbs: ['mass', 453.6], pound: ['mass', 453.6], pounds: ['mass', 453.6],
  ml: ['volume', 1], milliliter: ['volume', 1], milliliters: ['volume', 1],
  cl: ['volume', 10], dl: ['volume', 100],
  l: ['volume', 1000], liter: ['volume', 1000], liters: ['volume', 1000], litre: ['volume', 1000], litres: ['volume', 1000],
  cup: ['volume', 240], cups: ['volume', 240], 'fl oz': ['volume', 29.6],
  tbsp: ['volume', 15], tablespoon: ['volume', 15], tablespoons: ['volume', 15],
  tsp: ['volume', 5], teaspoon: ['volume', 5], teaspoons: ['volume', 5],
}

// 2 dl → { kind: 'volume', value: 200 } ; 1 cup → { kind: 'volume', value: 240 }
export function toBase(amount: number, unit: string) {
  const hit = BASE[unit.toLowerCase().trim()]
  return hit ? { kind: hit[0], value: amount * hit[1] } : null
}