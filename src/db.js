const DB_NAME = 'notes-db'
const DB_VERSION = 2
const NOTES_STORE = 'notes'
const GUIDES_STORE = 'guides'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(GUIDES_STORE)) {
        db.createObjectStore(GUIDES_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

// ── Notes ────────────────────────────────────────────────

export async function saveNote(note) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readwrite')
    const req = tx.objectStore(NOTES_STORE).add(note)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getNotes() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readonly')
    const req = tx.objectStore(NOTES_STORE).getAll()
    req.onsuccess = () => resolve(req.result.reverse())
    req.onerror = () => reject(req.error)
  })
}

export async function updateNote(note) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readwrite')
    const req = tx.objectStore(NOTES_STORE).put(note)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function deleteNote(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readwrite')
    const req = tx.objectStore(NOTES_STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ── Study Guides ─────────────────────────────────────────

export async function saveGuide(guide) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GUIDES_STORE, 'readwrite')
    const req = tx.objectStore(GUIDES_STORE).add(guide)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getGuides() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GUIDES_STORE, 'readonly')
    const req = tx.objectStore(GUIDES_STORE).getAll()
    req.onsuccess = () => resolve(req.result.reverse())
    req.onerror = () => reject(req.error)
  })
}

export async function deleteGuide(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GUIDES_STORE, 'readwrite')
    const req = tx.objectStore(GUIDES_STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
