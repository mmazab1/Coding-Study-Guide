import { useState, useEffect, useRef } from 'react'
import mammoth from 'mammoth'
import { saveNote, getNotes, deleteNote, updateNote } from '../db'
import { extractTextFromPDF } from '../pdfUtils'
import RichEditor from '../components/RichEditor'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const FILE_ICON = {
  'application/pdf': '📄',
  [DOCX_MIME]: '📄',
  'text/plain': '📄',
  'text/markdown': '📄',
  'text/csv': '📄',
  editor: '✏️',
}

function fileIcon(note) {
  if (note.source === 'editor') return '✏️'
  return FILE_ICON[note.type] || '📄'
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function Notes({ onBack }) {
  const [notes, setNotes] = useState([])
  const [selected, setSelected] = useState(null)
  const [loadingMsg, setLoadingMsg] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [search, setSearch] = useState('')

  // Editor state
  const [editorTitle, setEditorTitle] = useState('')
  const [editorHtml, setEditorHtml] = useState('')
  const [editorText, setEditorText] = useState('')
  const [editorMode, setEditorMode] = useState(false) // true = editor is open

  const fileInputRef = useRef(null)

  useEffect(() => {
    getNotes().then(setNotes)
  }, [])

  // Open a new blank editor note
  function openNewNote() {
    setSelected(null)
    setEditorTitle('')
    setEditorHtml('<p></p>')
    setEditorText('')
    setEditorMode(true)
  }

  // Click a note in the sidebar
  function selectNote(note) {
    if (note.source === 'editor') {
      setEditorTitle(note.name)
      setEditorHtml(note.htmlContent || '<p></p>')
      setEditorText(note.content || '')
      setEditorMode(true)
      setSelected(note)
    } else {
      setEditorMode(false)
      setSelected(note)
    }
  }

  async function saveEditorNote() {
    const name = editorTitle.trim() || 'Untitled Note'
    if (selected?.source === 'editor') {
      // Update existing
      const updated = { ...selected, name, htmlContent: editorHtml, content: editorText, updatedAt: Date.now() }
      await updateNote(updated)
      const all = await getNotes()
      setNotes(all)
      setSelected(all.find((n) => n.id === selected.id) || null)
    } else {
      // Create new
      const note = { name, source: 'editor', type: 'editor', htmlContent: editorHtml, content: editorText, createdAt: Date.now() }
      const id = await saveNote(note)
      const all = await getNotes()
      setNotes(all)
      setSelected(all.find((n) => n.id === id) || null)
    }
  }

  async function processFiles(files) {
    for (const file of files) {
      setLoadingMsg(`Reading "${file.name}"…`)
      let content = ''
      try {
        if (file.type === 'application/pdf') {
          const buf = await file.arrayBuffer()
          content = await extractTextFromPDF(buf)
        } else if (file.type === DOCX_MIME || file.name.endsWith('.docx')) {
          const buf = await file.arrayBuffer()
          const result = await mammoth.extractRawText({ arrayBuffer: buf })
          content = result.value
        } else {
          content = await file.text()
        }
      } catch (err) {
        content = `[Error reading file: ${err.message}]`
      }
      await saveNote({ name: file.name, source: 'upload', type: file.type || 'text/plain', content, createdAt: Date.now() })
    }
    const updated = await getNotes()
    setNotes(updated)
    setLoadingMsg(null)
  }

  function onFileChange(e) {
    processFiles([...e.target.files])
    e.target.value = ''
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFiles([...e.dataTransfer.files])
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    await deleteNote(id)
    const updated = await getNotes()
    setNotes(updated)
    if (selected?.id === id) {
      setSelected(null)
      setEditorMode(false)
    }
  }

  const filtered = notes.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    (n.content || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={onBack} title="Back to home">←</button>
          <h1>Notes</h1>
          <button className="icon-btn" title="New note" onClick={openNewNote}>✏️</button>
          <button className="upload-btn" onClick={() => fileInputRef.current.click()} disabled={!!loadingMsg} title="Upload file">↑</button>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.csv,.json" onChange={onFileChange} hidden />
        </div>

        <div className="search-wrap">
          <input
            className="search"
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ul className="note-list">
          {filtered.map((note) => (
            <li
              key={note.id}
              className={`note-item ${selected?.id === note.id ? 'active' : ''}`}
              onClick={() => selectNote(note)}
            >
              <span className="note-icon">{fileIcon(note)}</span>
              <div className="note-meta">
                <span className="note-name">{note.name}</span>
                <span className="note-date">{formatDate(note.createdAt)}</span>
              </div>
              <button className="delete-btn" onClick={(e) => handleDelete(note.id, e)} title="Delete">×</button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="empty">{search ? 'No matches found' : 'No notes yet'}</li>
          )}
        </ul>
      </aside>

      <main
        className={`content ${dragging && !editorMode ? 'dragging' : ''}`}
        onDragOver={(e) => { if (!editorMode) { e.preventDefault(); setDragging(true) } }}
        onDragLeave={() => setDragging(false)}
        onDrop={!editorMode ? onDrop : undefined}
      >
        {/* Loading */}
        {loadingMsg && (
          <div className="state-view">
            <div className="spinner" />
            <p>{loadingMsg}</p>
          </div>
        )}

        {/* Rich text editor */}
        {!loadingMsg && editorMode && (
          <div className="editor-page">
            <div className="editor-page-header">
              <input
                className="editor-title-input"
                type="text"
                placeholder="Note title…"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
              />
              <button className="save-btn" onClick={saveEditorNote}>Save</button>
            </div>
            <RichEditor
              key={selected?.id ?? 'new'}
              initialContent={editorHtml}
              onChange={(html, text) => { setEditorHtml(html); setEditorText(text) }}
            />
          </div>
        )}

        {/* Uploaded file viewer */}
        {!loadingMsg && !editorMode && selected && (
          <div className="note-view">
            <div className="note-view-header">
              <span className="note-view-icon">{fileIcon(selected)}</span>
              <div>
                <h2>{selected.name}</h2>
                <span className="note-view-date">{formatDate(selected.createdAt)}</span>
              </div>
            </div>
            <pre className="note-content">{selected.content}</pre>
          </div>
        )}

        {/* Empty state */}
        {!loadingMsg && !editorMode && !selected && (
          <div className="state-view drop-hint">
            <div className="drop-icon">⬆</div>
            <p>Drop files here, click <strong>↑</strong> to upload, or <strong>✏️</strong> to write a note</p>
            <p className="hint-sub">Supports PDF, DOCX, TXT, MD, CSV, JSON</p>
          </div>
        )}
      </main>
    </div>
  )
}
