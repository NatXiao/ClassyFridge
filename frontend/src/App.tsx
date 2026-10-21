import { useReducer } from 'react'
import { flowReducer } from './state/flow'

function App() {
  const [state, dispatch] = useReducer(flowReducer, { step: 'upload' })

  return (
    <main>
      {state.step === 'upload' && <div>Écran 1</div>}
      {state.step === 'review' && <div>Écran 2</div>}
      {state.step === 'recipes' && <div>Écran 3</div>}

      {/* temporaire : utilise dispatch tant que les écrans n'existent pas */}
      <button type="button" onClick={() => dispatch({ type: 'reset' })}>
        Recommencer
      </button>
    </main>
  )
}

export default App