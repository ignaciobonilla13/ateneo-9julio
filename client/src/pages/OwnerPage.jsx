import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import EditorPage from './Editor.jsx'
import PresenterPage from './Presenter.jsx'

export default function OwnerPage() {
  const location = useLocation()
  const [mode, setMode] = useState(location.state?.mode === 'edit' ? 'edit' : 'present')
  if (mode === 'edit') return <EditorPage onProject={() => setMode('present')} />
  return <PresenterPage onEdit={() => setMode('edit')} />
}
