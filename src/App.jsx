import { useState } from 'react'
import Home from './pages/Home'
import Notes from './pages/Notes'
import StudyGuide from './pages/StudyGuide'
import './App.css'

export default function App() {
  const [page, setPage] = useState('home')

  if (page === 'notes') return <Notes onBack={() => setPage('home')} />
  if (page === 'study-guide') return <StudyGuide onBack={() => setPage('home')} />
  return <Home onNavigate={setPage} />
}
