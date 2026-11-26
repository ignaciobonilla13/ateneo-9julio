import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid min-h-dvh place-items-center px-6 text-center">
          <div>
            <p className="text-2xl font-semibold">Se cortó esta pantalla.</p>
            <button type="button" className="mt-4 rounded-full px-4 py-2" style={{ background: '#171c24' }} onClick={() => window.location.reload()}>
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Boundary>
        <App />
      </Boundary>
    </BrowserRouter>
  </StrictMode>,
)
