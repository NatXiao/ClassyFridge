import type { Analysis, Recipe } from '../api/client'

export type Decision = { status: 'yes' | 'no' | null; qty: number; unit: Unit; manual?: boolean }

export type FlowState =
  | { step: 'upload' }
  | { step: 'review'; analysis: Analysis; decisions: Record<string, Decision> }
  | { step: 'recipes'; analysis: Analysis; decisions: Record<string, Decision>; recipes: Recipe[] }

export type FlowAction =
  | { type: 'analyzed'; analysis: Analysis }
  | { type: 'decide'; name: string; decision: Partial<Decision> }
  | { type: 'recipesReady'; recipes: Recipe[] }
  | { type: 'backToReview' }
  | { type: 'reset' }
  | { type: 'add'; name: string; qty: number; unit: Unit }
  | { type: 'remove'; name: string }

export type Unit = '' | 'g' | 'l' | 'dl' | 'cl'

type UnitInfo = { label: string; short: string; step: number; min: number; initial: number; decimals: boolean }

export const UNITS: Record<Unit, UnitInfo> = {
  '': { label: 'pièces',      short: 'pc', step: 1,   min: 1,   initial: 1,   decimals: false },
  g:  { label: 'grammes',     short: 'g',  step: 10,  min: 1,   initial: 100, decimals: false },
  l:  { label: 'litres',      short: 'l',  step: 0.5, min: 0.1, initial: 1,   decimals: true },
  dl: { label: 'décilitres',  short: 'dl', step: 1,   min: 0.5, initial: 2,   decimals: true },
  cl: { label: 'centilitres', short: 'cl', step: 10,  min: 1,   initial: 25,  decimals: false },
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Va au multiple du pas suivant / précédent : 53 g → 60 ou 50, 1,3 l → 1,5 ou 1
export const stepUp = (qty: number, unit: Unit) => {
  const { step } = UNITS[unit]
  return round2(Math.floor(round2(qty / step)) * step + step)
}

export const stepDown = (qty: number, unit: Unit) => {
  const { step, min } = UNITS[unit]
  return Math.max(min, round2(Math.ceil(round2(qty / step)) * step - step))
}

// Affichage à la française : 1.5 → "1,5"
export const formatQty = (qty: number) => String(round2(qty)).replace('.', ',')

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'analyzed':
      return {
        step: 'review',
        analysis: action.analysis,
        decisions: Object.fromEntries(
          action.analysis.ingredients.map((i) => [
            i.ingredient_name,
            { status: null, qty: i.instance_count, unit: '' as Unit },
          ]),
        ),
      }
    case 'decide':
      if (state.step !== 'review') return state
      return {
        ...state,
        decisions: {
          ...state.decisions,
          [action.name]: { ...state.decisions[action.name], ...action.decision },
        },
      }
    case 'recipesReady':
      if (state.step !== 'review') return state
      return { ...state, step: 'recipes', recipes: action.recipes }
    case 'backToReview':
      if (state.step !== 'recipes') return state
      return { step: 'review', analysis: state.analysis, decisions: state.decisions }
    case 'add': {
      if (state.step !== 'review') return state
      const existing = state.decisions[action.name]
      return {
        ...state,
        decisions: {
          ...state.decisions,
          [action.name]: {
            status: 'yes',
            qty: action.qty,
            unit: action.unit,
            manual: existing ? existing.manual : true,
          },
        },
      }
    }
    case 'remove': {
      if (state.step !== 'review' || !state.decisions[action.name]?.manual) return state
      const decisions = { ...state.decisions }
      delete decisions[action.name]
      return { ...state, decisions }
    }
    case 'reset':
      return { step: 'upload' }
  }
}
