import {
  predictionMapToList,
  type Analysis,
  type Prediction,
  type Recipe,
} from '../api/client'

/* --------------------------------------------------------------------------
   Units (unchanged)
   -------------------------------------------------------------------------- */

export type Unit = '' | 'g' | 'l' | 'dl' | 'cl'

type UnitInfo = { label: string; short: string; step: number; min: number; initial: number; decimals: boolean }

export const UNITS: Record<Unit, UnitInfo> = {
  '': { label: 'pieces',      short: 'pc', step: 1,   min: 1,   initial: 1,   decimals: false },
  g:  { label: 'grams',       short: 'g',  step: 10,  min: 1,   initial: 100, decimals: false },
  l:  { label: 'litres',      short: 'l',  step: 0.5, min: 0.1, initial: 1,   decimals: true },
  dl: { label: 'decilitres',  short: 'dl', step: 1,   min: 0.5, initial: 2,   decimals: true },
  cl: { label: 'centilitres', short: 'cl', step: 10,  min: 1,   initial: 25,  decimals: false },
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Next / previous multiple of the step: 53 g → 60 or 50, 1.3 l → 1.5 or 1
export const stepUp = (qty: number, unit: Unit) => {
  const { step } = UNITS[unit]
  return round2(Math.floor(round2(qty / step)) * step + step)
}

export const stepDown = (qty: number, unit: Unit) => {
  const { step, min } = UNITS[unit]
  return Math.max(min, round2(Math.ceil(round2(qty / step)) * step - step))
}

// French-style display: 1.5 → "1,5"
export const formatQty = (qty: number) => String(round2(qty))

/* --------------------------------------------------------------------------
   Decisions: one per card = one per crop (or per manual item)
   -------------------------------------------------------------------------- */

export const MAX_GUESSES = 5

const isMushroom = (name: string) => {
  const normalized = name.trim().toLowerCase()
  return normalized === 'mushroom' || normalized === 'mushrooms'
}

export type Decision = {
  id: string
  group: string                // deck the card sits in (label detected first)
  name: string                 // label currently shown
  status: 'yes' | 'no' | null
  qty: number                  // 1 per detected card, free for manual items
  unit: Unit
  crop?: string
  candidates: Prediction[]     // model guesses, best first
  attempt: number              // index of the guess currently shown
  exhausted: boolean           // every guess rejected: Select / Retake photo
  pilePriority?: number        // lower values are shown first in a pile
  classifying?: boolean        // retake photo waiting in the classifier queue
  error?: string
  manual?: boolean
  isPoisonous?: boolean | null // only meaningful when the current label is mushroom
}

export type FlowState =
  | { step: 'upload' }
  | { step: 'review'; analysis: Analysis; decisions: Record<string, Decision> }
  | { step: 'recipes'; analysis: Analysis; decisions: Record<string, Decision>; recipes: Recipe[] }

export type FlowAction =
  | { type: 'analyzed'; analysis: Analysis }
  | { type: 'decide'; id: string; decision: Partial<Pick<Decision, 'status' | 'qty' | 'unit'>> }
  | { type: 'reject'; id: string }
  | { type: 'confirmAll'; group: string }
  | { type: 'select'; id: string; name: string }
  | { type: 'mushroomClassificationStarted'; id: string; name: string }
  | { type: 'mushroomClassified'; id: string; isPoisonous: boolean; confirm: boolean }
  | { type: 'retake'; id: string; crop: string }
  | { type: 'classified'; id: string; candidates: Prediction[]; isPoisonous: boolean }
  | { type: 'classifyFailed'; id: string; error: string }
  | { type: 'add'; name: string; qty: number; unit: Unit }
  | { type: 'remove'; id: string }
  | { type: 'recipesReady'; recipes: Recipe[] }
  | { type: 'backToReview' }
  | { type: 'reset' }

// Confirmed items merged by name + unit: sent to the recipe API and shown on screen 3
export function confirmedStock(decisions: Record<string, Decision>) {
  const totals = new Map<string, { name: string; qty: number; unit: Unit }>()
  for (const d of Object.values(decisions)) {
    if (d.status !== 'yes') continue
    const key = `${d.name}|${d.unit}`
    const total = totals.get(key) ?? { name: d.name, qty: 0, unit: d.unit }
    total.qty += d.qty
    totals.set(key, total)
  }
  return [...totals.values()]
}

/* --------------------------------------------------------------------------
   Reducer
   -------------------------------------------------------------------------- */

type Review = Extract<FlowState, { step: 'review' }>

const put = (state: Review, d: Decision): Review => ({
  ...state,
  decisions: { ...state.decisions, [d.id]: d },
})

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  if (action.type === 'analyzed') {
    const decisions: Record<string, Decision> = {}
    for (const item of action.analysis.items) {
      const id = String(item.item_id)
      decisions[id] = {
        id,
        group: item.ingredient_name,
        name: item.ingredient_name,
        status:null,
        qty: 1,
        unit: '',
        crop: item.image_url ?? undefined,
        candidates: predictionMapToList(item.predictions).slice(0, MAX_GUESSES),
        attempt: 0,
        exhausted: false,
        isPoisonous: isMushroom(item.ingredient_name)
          ? item.is_poisonous
          : null,
      }
    }
    return { step: 'review', analysis: action.analysis, decisions }
  }
  if (action.type === 'reset') return { step: 'upload' }
  if (action.type === 'backToReview') {
    return state.step === 'recipes'
      ? { step: 'review', analysis: state.analysis, decisions: state.decisions }
      : state
  }
  if (state.step !== 'review') return state // late answers from the queue are ignored

  switch (action.type) {
    case 'decide': {
      const d = state.decisions[action.id]
      if (!d) return state
      return put(state, { ...d, ...action.decision })
    }
    case 'reject': {
      const d = state.decisions[action.id]
      if (!d || d.classifying) return state
      const next = d.attempt + 1
      if (next < d.candidates.length) {
        const name = d.candidates[next].ingredient_name
        return put(state, {
          ...d,
          name,
          attempt: next,
          status: null,
          isPoisonous: isMushroom(name) ? d.isPoisonous : null,
        })
      }
      return put(state, { ...d, attempt: next, exhausted: true, status: null })
    }
    case 'confirmAll': {
      let next = state
      for (const d of Object.values(state.decisions)) {
        const untouched = d.status === null && d.attempt === 0 && !d.exhausted && !d.classifying
        if (d.group === action.group && untouched) next = put(next, { ...d, status: 'yes' })
      }
      return next
    }
    case 'select': {
      const d = state.decisions[action.id]
      return d ? put(state, {
        ...d,
        name: action.name,
        status: 'yes',
        exhausted: false,
        error: undefined,
        isPoisonous: null,
      }) : state
    }
    case 'mushroomClassificationStarted': {
      const d = state.decisions[action.id]
      return d ? put(state, {
        ...d,
        name: action.name,
        status: null,
        classifying: true,
        exhausted: false,
        error: undefined,
        isPoisonous: null,
      }) : state
    }
    case 'mushroomClassified': {
      const d = state.decisions[action.id]
      return d ? put(state, {
        ...d,
        classifying: false,
        status: action.confirm ? 'yes' : d.status,
        isPoisonous: action.isPoisonous,
      }) : state
    }
    case 'retake': {
      const d = state.decisions[action.id]
      return d
        ? put(state, { ...d, crop: action.crop, classifying: true, exhausted: false, status: null, error: undefined })
        : state
    }
    case 'classified': {
      const d = state.decisions[action.id]
      if (!d) return state
      const candidates = action.candidates.slice(0, MAX_GUESSES)
      if (candidates.length === 0) {
        return put(state, { ...d, classifying: false, exhausted: true, error: 'The model could not recognise this photo.' })
      }
      const pilePriority = Math.min(
        0,
        ...Object.values(state.decisions).map(
          (decision) => decision.pilePriority ?? 0,
        ),
      ) - 1

      return put(state, {
        ...d,
        classifying: false,
        candidates,
        attempt: 0,
        group: candidates[0].ingredient_name,
        name: candidates[0].ingredient_name,
        isPoisonous: isMushroom(candidates[0].ingredient_name)
          ? action.isPoisonous
          : null,
        pilePriority,
        status: null,
      })
    }
    case 'classifyFailed': {
      const d = state.decisions[action.id]
      return d ? put(state, { ...d, classifying: false, exhausted: true, error: action.error }) : state
    }
    case 'add': {
      const id = `manual:${action.name}`
      return put(state, {
        id, group: id, name: action.name, status: 'yes', qty: action.qty, unit: action.unit,
        candidates: [], attempt: 0, exhausted: false, manual: true,
      })
    }
    case 'remove': {
      if (!state.decisions[action.id]?.manual) return state
      const decisions = { ...state.decisions }
      delete decisions[action.id]
      return { ...state, decisions }
    }
    case 'recipesReady':
      return { ...state, step: 'recipes', recipes: action.recipes }
  }
}
