import 'dotenv/config'
import express from 'express'

const app = express()
app.use(express.json({ limit: '2mb' }))

const PORT = 3001
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1'

// ── Provider detection ────────────────────────────────────

async function ollamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

async function ollamaModelAvailable() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) })
    const data = await res.json()
    return data.models?.some((m) => m.name.startsWith(OLLAMA_MODEL.split(':')[0]))
  } catch {
    return false
  }
}

app.get('/api/provider', async (req, res) => {
  if (process.env.ANTHROPIC_API_KEY) {
    return res.json({ provider: 'anthropic', model: 'claude-sonnet-4-6' })
  }
  const running = await ollamaRunning()
  if (!running) {
    return res.json({ provider: 'none', reason: 'ollama_not_running' })
  }
  const hasModel = await ollamaModelAvailable()
  if (!hasModel) {
    return res.json({ provider: 'none', reason: 'model_not_found', model: OLLAMA_MODEL })
  }
  return res.json({ provider: 'ollama', model: OLLAMA_MODEL })
})

// ── Prompt builder ────────────────────────────────────────

function buildPrompt(notes, questionTypes, questionsPerType) {
  const notesText = notes
    .map((n, i) => `--- Note ${i + 1}: ${n.name} ---\n${n.content}`)
    .join('\n\n')

  const typeDescriptions = {
    multiple_choice: `"multiple_choice": [ { "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A" } ]`,
    true_false:      `"true_false":      [ { "question": "...", "answer": true } ]`,
    short_answer:    `"short_answer":    [ { "question": "...", "answer": "..." } ]`,
    matching:        `"matching":        [ { "term": "...", "definition": "..." } ]`,
  }

  const schemaLines = questionTypes.map((t) => typeDescriptions[t]).join(',\n    ')

  return `You are an expert educator. Create a study guide from the notes below.

NOTES:
${notesText}

Generate exactly ${questionsPerType} questions for each type: ${questionTypes.join(', ')}.

Rules:
- Questions must come directly from the notes content.
- Multiple choice must have exactly 4 options labeled A, B, C, D.
- True/false statements must be unambiguous.
- Short answer answers should be concise and factual.
- Matching pairs should link key terms to their definitions from the notes.

Respond with ONLY a valid JSON object in this exact shape (no extra text):
{
  "title": "<title based on notes content>",
  "sections": {
    ${schemaLines}
  }
}`
}

// ── Generation ────────────────────────────────────────────

async function generateWithOllama(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      format: 'json', // forces valid JSON output
      stream: false,
      options: { temperature: 0.3 },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ollama error (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.response
}

async function generateWithAnthropic(prompt, apiKey) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: 'You are a study guide generator. Output only valid JSON — no markdown, no explanation.',
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].text.trim()
  return raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
}

// ── Route ─────────────────────────────────────────────────

app.post('/api/generate-study-guide', async (req, res) => {
  const { notes, questionTypes, questionsPerType } = req.body

  if (!notes?.length)      return res.status(400).json({ error: 'No notes provided.' })
  if (!questionTypes?.length) return res.status(400).json({ error: 'No question types selected.' })

  const prompt = buildPrompt(notes, questionTypes, questionsPerType)

  try {
    let raw
    if (process.env.ANTHROPIC_API_KEY) {
      raw = await generateWithAnthropic(prompt, process.env.ANTHROPIC_API_KEY)
    } else {
      const running = await ollamaRunning()
      if (!running) {
        return res.status(503).json({
          error: 'Ollama is not running. Start it with: ollama serve',
        })
      }
      raw = await generateWithOllama(prompt)
    }

    const guide = JSON.parse(raw)
    res.json(guide)
  } catch (err) {
    console.error('Generation error:', err)
    if (err instanceof SyntaxError) {
      res.status(500).json({ error: 'Could not parse AI response — try again or use a larger model.' })
    } else {
      res.status(500).json({ error: err.message || 'Generation failed.' })
    }
  }
})

app.listen(PORT, () => {
  const provider = process.env.ANTHROPIC_API_KEY ? 'Anthropic (Claude)' : `Ollama (${OLLAMA_MODEL})`
  console.log(`Study Guide API on http://localhost:${PORT} — using ${provider}`)
})
