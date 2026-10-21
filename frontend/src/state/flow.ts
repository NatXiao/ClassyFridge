import type { Analysis, Recipe } from '../api/client'

export type Decision = { status: 'yes' | 'no' | null; qty: number }

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

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'analyzed':
      return {
        step: 'review',
        analysis: action.analysis,
        decisions: Object.fromEntries(
          action.analysis.ingredients.map((i) => [
            i.ingredient_name,
            { status: null, qty: i.instance_count },
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
    case 'reset':
      return { step: 'upload' }
  }
}
