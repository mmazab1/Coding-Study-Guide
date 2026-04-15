function greeting() {
  return 'Welcome to The Study Guide Creator'
}

const SECTIONS = [
  {
    id: 'notes',
    label: 'Notes',
    icon: '📂',
    description: 'Upload and read your study files — PDFs, DOCX, and more.',
    available: true,
  },
  {
    id: 'study-guide',
    label: 'Study Guide',
    icon: '📋',
    description: 'Generate quizzes and study guides from your notes using AI.',
    available: true,
  },
]

export default function Home({ onNavigate }) {
  return (
    <div className="home">
      <header className="home-header">
        <div className="home-greeting">
          <span className="home-greeting-text">{greeting()}</span>
        </div>
      </header>

      <section className="home-about">
        <h2 className="home-about-title">About This Site</h2>
        <p className="home-about-body">
          {/* You can fill this in later */}
          Description coming soon.
        </p>
      </section>

      <section className="home-sections">
        <h2 className="home-sections-title">Sections</h2>
        <div className="section-grid">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`section-card ${s.available ? 'available' : 'locked'}`}
              onClick={() => s.available && onNavigate(s.id)}
              disabled={!s.available}
            >
              <span className="section-card-icon">{s.icon}</span>
              <span className="section-card-label">{s.label}</span>
              <span className="section-card-desc">{s.description}</span>
              {!s.available && <span className="section-card-badge">Coming soon</span>}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
