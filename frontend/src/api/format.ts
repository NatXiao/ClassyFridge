const UNIT_FR: Record<string, string> = {
  tbsp: 'c. à s.', tablespoon: 'c. à s.', tablespoons: 'c. à s.', Tbsp: 'c. à s.', Tbsps: 'c. à s.',
  tsp: 'c. à c.', teaspoon: 'c. à c.', teaspoons: 'c. à c.',
  cup: 'tasse', cups: 'tasses', slice: 'tranche', slices: 'tranches',
  clove: 'gousse', cloves: 'gousses', pinch: 'pincée', handful: 'poignée',
  large: '', medium: '', small: '', serving: '', servings: '',
}

const FRACTIONS: [number, string][] = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [0.75, '¾']]

export function formatAmount(n: number, unit: string) {
  if (n <= 0) return ''
  const u = UNIT_FR[unit] ?? unit
  // grammes et millilitres : nombres ronds
  if (['g', 'ml', 'kg', 'l'].includes(u)) return `${Math.round(n)} ${u}`
  const whole = Math.floor(n)
  const rest = n - whole
  const frac = FRACTIONS.find(([v]) => Math.abs(v - rest) < 0.06)?.[1]
  const num = frac ? `${whole || ''}${frac}` : String(Math.round(n * 10) / 10)
  return u ? `${num} ${u}` : num
}
