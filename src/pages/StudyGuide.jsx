import { useState, useEffect } from 'react'
import { getNotes, saveGuide, getGuides, deleteGuide } from '../db'

const QUESTION_TYPES = [
  { id: 'multiple_choice', label: 'Multiple Choice' },
  { id: 'true_false',      label: 'True / False' },
  { id: 'short_answer',    label: 'Short Answer' },
  { id: 'matching',        label: 'Matching' },
]

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ProviderBanner({ provider }) {
  if (!provider) return null

  if (provider.provider === 'anthropic') {
    return (
      <div className="provider-banner provider-ok">
        Using Claude (Anthropic) — {provider.model}
      </div>
    )
  }

  if (provider.provider === 'ollama') {
    return (
      <div className="provider-banner provider-ok">
        Using Ollama — {provider.model} (local, no API key needed)
      </div>
    )
  }

  // Not configured — show setup instructions
  const reason = provider.reason
  return (
    <div className="provider-banner provider-warn">
      <strong>AI provider not available.</strong>
      {reason === 'server_not_running' && (
        <p>The backend server is not running. Start it with <code>npm run dev</code>.</p>
      )}
      {reason === 'ollama_not_running' && (
        <>
          <p>To use this feature for free, install <strong>Ollama</strong>:</p>
          <ol>
            <li>Download from <strong>ollama.com</strong> and install it</li>
            <li>Open a terminal and run: <code>ollama pull llama3.1</code></li>
            <li>Ollama will run automatically in the background</li>
          </ol>
          <p>Or set <code>ANTHROPIC_API_KEY</code> in a <code>.env.local</code> file to use Claude instead.</p>
        </>
      )}
      {reason === 'model_not_found' && (
        <>
          <p>Ollama is running but the model <code>{provider.model}</code> is not installed.</p>
          <p>Run in your terminal: <code>ollama pull {provider.model}</code></p>
          <p>Or set <code>OLLAMA_MODEL</code> in <code>.env.local</code> to use a different model you already have.</p>
        </>
      )}
    </div>
  )
}

// ── Shuffle helper ────────────────────────────────────────
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── Section renderers ─────────────────────────────────────

function MultipleChoiceSection({ questions, reviewMode }) {
  const [selected, setSelected] = useState({})
  const [checked, setChecked] = useState({})

  function check(qi) {
    setChecked((c) => ({ ...c, [qi]: true }))
  }

  return (
    <div className="sg-section">
      <h3 className="sg-section-title">Multiple Choice</h3>
      {questions.map((q, qi) => {
        const isChecked = reviewMode || checked[qi]
        return (
          <div key={qi} className="sg-question">
            <p className="sg-q-text"><span className="sg-q-num">{qi + 1}.</span> {q.question}</p>
            <div className="sg-options">
              {q.options.map((opt) => {
                const letter = opt[0]
                const isCorrect = letter === q.answer
                const isSelected = selected[qi] === letter
                let cls = 'sg-option'
                if (isChecked && isCorrect) cls += ' correct'
                else if (isChecked && isSelected && !isCorrect) cls += ' wrong'
                else if (isSelected) cls += ' selected'
                return (
                  <button
                    key={letter}
                    className={cls}
                    onClick={() => !isChecked && setSelected((s) => ({ ...s, [qi]: letter }))}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {!reviewMode && !checked[qi] && (
              <button className="sg-reveal-btn" onClick={() => check(qi)}>Check Answer</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TrueFalseSection({ questions, reviewMode }) {
  const [selected, setSelected] = useState({})
  const [checked, setChecked] = useState({})

  return (
    <div className="sg-section">
      <h3 className="sg-section-title">True / False</h3>
      {questions.map((q, qi) => {
        const isChecked = reviewMode || checked[qi]
        const correct = q.answer
        return (
          <div key={qi} className="sg-question">
            <p className="sg-q-text"><span className="sg-q-num">{qi + 1}.</span> {q.question}</p>
            <div className="sg-tf-btns">
              {[true, false].map((val) => {
                const label = val ? 'True' : 'False'
                const isCorrect = val === correct
                const isSelected = selected[qi] === val
                let cls = 'sg-tf-btn'
                if (isChecked && isCorrect) cls += ' correct'
                else if (isChecked && isSelected && !isCorrect) cls += ' wrong'
                else if (isSelected) cls += ' selected'
                return (
                  <button
                    key={label}
                    className={cls}
                    onClick={() => !isChecked && setSelected((s) => ({ ...s, [qi]: val }))}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {!reviewMode && !checked[qi] && (
              <button className="sg-reveal-btn" onClick={() => setChecked((c) => ({ ...c, [qi]: true }))}>Check Answer</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ShortAnswerSection({ questions, reviewMode }) {
  const [revealed, setRevealed] = useState({})

  return (
    <div className="sg-section">
      <h3 className="sg-section-title">Short Answer</h3>
      {questions.map((q, qi) => (
        <div key={qi} className="sg-question">
          <p className="sg-q-text"><span className="sg-q-num">{qi + 1}.</span> {q.question}</p>
          {(reviewMode || revealed[qi])
            ? <div className="sg-answer-box"><span className="sg-answer-label">Answer: </span>{q.answer}</div>
            : <button className="sg-reveal-btn" onClick={() => setRevealed((r) => ({ ...r, [qi]: true }))}>Show Answer</button>
          }
        </div>
      ))}
    </div>
  )
}

function MatchingSection({ questions, reviewMode }) {
  const [shuffledDefs, setShuffledDefs] = useState(() => shuffle(questions))
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="sg-section">
      <h3 className="sg-section-title">Matching</h3>
      <div className="sg-matching-grid">
        <div className="sg-matching-col">
          <p className="sg-col-header">Terms</p>
          {questions.map((q, i) => (
            <div key={i} className="sg-match-cell sg-match-term">{i + 1}. {q.term}</div>
          ))}
        </div>
        <div className="sg-matching-col">
          <p className="sg-col-header">Definitions</p>
          {(revealed || reviewMode ? questions : shuffledDefs).map((q, i) => (
            <div key={i} className={`sg-match-cell sg-match-def ${(revealed || reviewMode) ? 'matched' : ''}`}>
              {(revealed || reviewMode) ? <><span className="sg-match-num">{i + 1}.</span> {q.definition}</> : q.definition}
            </div>
          ))}
        </div>
      </div>
      <div className="sg-matching-actions">
        {!reviewMode && !revealed && (
          <>
            <button className="sg-reveal-btn" onClick={() => setRevealed(true)}>Show Matches</button>
            <button className="sg-reveal-btn" onClick={() => setShuffledDefs(shuffle(questions))}>Reshuffle</button>
          </>
        )}
      </div>
    </div>
  )
}

function GuideViewer({ guide, reviewMode, onToggleReview }) {
  const { sections } = guide

  return (
    <div className="guide-viewer">
      <div className="guide-viewer-header">
        <h2 className="guide-title">{guide.title}</h2>
        <div className="guide-header-actions">
          <span className="guide-meta">{formatDate(guide.createdAt)}</span>
          <button
            className={`mode-toggle ${reviewMode ? 'active' : ''}`}
            onClick={onToggleReview}
          >
            {reviewMode ? 'Study Mode' : 'Review Mode'}
          </button>
        </div>
      </div>

      {sections.multiple_choice?.length > 0 && (
        <MultipleChoiceSection questions={sections.multiple_choice} reviewMode={reviewMode} />
      )}
      {sections.true_false?.length > 0 && (
        <TrueFalseSection questions={sections.true_false} reviewMode={reviewMode} />
      )}
      {sections.short_answer?.length > 0 && (
        <ShortAnswerSection questions={sections.short_answer} reviewMode={reviewMode} />
      )}
      {sections.matching?.length > 0 && (
        <MatchingSection questions={sections.matching} reviewMode={reviewMode} />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export default function StudyGuide({ onBack }) {
  const [notes, setNotes] = useState([])
  const [guides, setGuides] = useState([])
  const [selectedNotes, setSelectedNotes] = useState([])
  const [selectedTypes, setSelectedTypes] = useState({ multiple_choice: true, true_false: true, short_answer: false, matching: false })
  const [questionsPerType, setQuestionsPerType] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const [currentGuide, setCurrentGuide] = useState(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'generate' | 'view'
  const [provider, setProvider] = useState(null) // { provider, model, reason }

  useEffect(() => {
    getNotes().then(setNotes)
    getGuides().then(setGuides)
    fetch('/api/provider').then((r) => r.json()).then(setProvider).catch(() => setProvider({ provider: 'none', reason: 'server_not_running' }))
  }, [])

  function toggleNote(id) {
    setSelectedNotes((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    )
  }

  function toggleType(id) {
    setSelectedTypes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function generate() {
    const chosenNotes = notes.filter((n) => selectedNotes.includes(n.id))
    const chosenTypes = Object.entries(selectedTypes).filter(([, v]) => v).map(([k]) => k)

    if (!chosenNotes.length) { setGenError('Select at least one note.'); return }
    if (!chosenTypes.length) { setGenError('Select at least one question type.'); return }

    setGenerating(true)
    setGenError(null)

    try {
      const res = await fetch('/api/generate-study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: chosenNotes.map((n) => ({ name: n.name, content: n.content || '' })),
          questionTypes: chosenTypes,
          questionsPerType,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed.')

      const guide = { ...data, createdAt: Date.now(), sourceNotes: chosenNotes.map((n) => n.name) }
      const id = await saveGuide(guide)
      const updated = await getGuides()
      setGuides(updated)
      setCurrentGuide({ ...guide, id })
      setReviewMode(false)
      setView('view')
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeleteGuide(id, e) {
    e.stopPropagation()
    await deleteGuide(id)
    setGuides(await getGuides())
    if (currentGuide?.id === id) { setCurrentGuide(null); setView('list') }
  }

  const activeTypes = Object.values(selectedTypes).filter(Boolean).length

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={onBack} title="Back to home">←</button>
          <h1>Study Guides</h1>
          <button className="upload-btn" onClick={() => { setView('generate'); setCurrentGuide(null) }}>+ New</button>
        </div>

        <ul className="note-list">
          {guides.map((g) => (
            <li
              key={g.id}
              className={`note-item ${currentGuide?.id === g.id ? 'active' : ''}`}
              onClick={() => { setCurrentGuide(g); setReviewMode(false); setView('view') }}
            >
              <span className="note-icon">📋</span>
              <div className="note-meta">
                <span className="note-name">{g.title}</span>
                <span className="note-date">{formatDate(g.createdAt)}</span>
              </div>
              <button className="delete-btn" onClick={(e) => handleDeleteGuide(g.id, e)} title="Delete">×</button>
            </li>
          ))}
          {guides.length === 0 && <li className="empty">No guides yet</li>}
        </ul>
      </aside>

      {/* Main */}
      <main className="content">

        {/* Empty / landing state */}
        {view === 'list' && (
          <div className="state-view">
            <div className="drop-icon">📋</div>
            <p>Select a guide or click <strong>+ New</strong> to generate one</p>
          </div>
        )}

        {/* Generation form */}
        {view === 'generate' && (
          <div className="sg-form">
            <h2 className="sg-form-title">Generate Study Guide</h2>

            {/* Provider status banner */}
            <ProviderBanner provider={provider} />

            {/* Note selection */}
            <div className="sg-form-section">
              <h3 className="sg-form-label">1. Select Notes to Study From</h3>
              {notes.length === 0
                ? <p className="sg-form-hint">No notes found. Add notes in the Notes section first.</p>
                : (
                  <div className="sg-note-list">
                    {notes.map((n) => (
                      <label key={n.id} className="sg-check-row">
                        <input
                          type="checkbox"
                          checked={selectedNotes.includes(n.id)}
                          onChange={() => toggleNote(n.id)}
                        />
                        <span className="sg-check-label">{n.name}</span>
                        <span className="sg-check-sub">{formatDate(n.createdAt)}</span>
                      </label>
                    ))}
                  </div>
                )
              }
            </div>

            {/* Question types */}
            <div className="sg-form-section">
              <h3 className="sg-form-label">2. Question Types</h3>
              <div className="sg-type-grid">
                {QUESTION_TYPES.map((t) => (
                  <label key={t.id} className={`sg-type-card ${selectedTypes[t.id] ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedTypes[t.id]}
                      onChange={() => toggleType(t.id)}
                      hidden
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Questions per type */}
            <div className="sg-form-section">
              <h3 className="sg-form-label">3. Questions per Type: <strong>{questionsPerType}</strong></h3>
              <input
                type="range"
                min={3}
                max={15}
                value={questionsPerType}
                onChange={(e) => setQuestionsPerType(Number(e.target.value))}
                className="sg-slider"
              />
              <div className="sg-slider-labels"><span>3</span><span>15</span></div>
            </div>

            {genError && <p className="sg-error">{genError}</p>}

            <button
              className="sg-generate-btn"
              onClick={generate}
              disabled={generating || selectedNotes.length === 0 || activeTypes === 0}
            >
              {generating ? 'Generating…' : `Generate Study Guide (${activeTypes} type${activeTypes !== 1 ? 's' : ''})`}
            </button>

            {generating && (
              <div className="sg-generating">
                <div className="spinner" />
                <p>Analyzing notes and writing questions…</p>
              </div>
            )}
          </div>
        )}

        {/* Guide viewer */}
        {view === 'view' && currentGuide && (
          <GuideViewer
            key={currentGuide.id}
            guide={currentGuide}
            reviewMode={reviewMode}
            onToggleReview={() => setReviewMode((r) => !r)}
          />
        )}
      </main>
    </div>
  )
}
