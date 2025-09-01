import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 8080

// Ultra-simple CORS
app.use(cors())

app.use(express.json())

// Only essential routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', port: PORT })
})

app.get('/api/models', (req, res) => {
  res.json({
    models: {
      "gemini-2.0-flash": { 
        name: "LashivGPT Fast",
        description: "Quick and efficient responses for fast interactions",
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      },
      "gemini-2.5-pro": { 
        name: "LashivGPT Pro",
        description: "Most advanced AI with enhanced reasoning capabilities",
        maxTokens: 32768,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      },
      "gemini-1.5-pro": { 
        name: "LashivGPT Standard",
        description: "Balanced performance with good cost efficiency",
        maxTokens: 16384,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    },
    defaultModel: "gemini-2.0-flash"
  })
})

app.post('/api/chat', (req, res) => {
  res.json({ 
    reply: "Hello! I'm LashivGPT. This is a test response.",
    history: []
  })
})

app.get('/api/history/:userId', (req, res) => {
  res.json({ history: [] })
})

app.delete('/api/history/:userId', (req, res) => {
  res.json({ ok: true })
})

app.post('/api/generate-image', (req, res) => {
  res.json({ 
    reply: "Image generation temporarily disabled.",
    history: []
  })
})

app.listen(PORT, () => {
  console.log(`Ultra-simple server running on port ${PORT}`)
})
