import { useReducer } from 'react'
import { flowReducer } from './state/flow'
import { Header } from './components/Header'
import { UploadScreen } from './screens/UploadScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { RecipesScreen } from './screens/RecipesScreen'

function App() {
  const [state, dispatch] = useReducer(flowReducer, { step: 'upload' })

  return (
    <>
      <Header step={state.step} />
      {state.step === 'upload' && <UploadScreen dispatch={dispatch} />}
      {state.step === 'review' && <div>Écran 2</div>}
      {state.step === 'recipes' && <div>Écran 3</div>}
      {state.step === 'review' && (
        <ReviewScreen analysis={state.analysis} decisions={state.decisions} dispatch={dispatch} />
      )}
      {state.step === 'recipes' && (
        <RecipesScreen recipes={state.recipes} decisions={state.decisions} dispatch={dispatch} />
      )}
    </>
  )
}

export default App