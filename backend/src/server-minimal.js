import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 8080

// Simple CORS
app.use(cors({
  origin: true,
  credentials: true
}))

app.use(express.json())

// Basic routes only
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', port: PORT })
})

app.get('/api/models', (req, res) => {
  res.json({
    models: {
      "gemini-2.0-flash": { name: "LashivGPT Fast" },
      "gemini-2.5-pro": { name: "LashivGPT Pro" },
      "gemini-1.5-pro": { name: "LashivGPT Standard" }
    }
  })
})

app.post('/api/chat', (req, res) => {
  res.json({ 
    reply: "Hello! I'm LashivGPT. This is a test response.",
    history: []
  })
})

app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`)
})
