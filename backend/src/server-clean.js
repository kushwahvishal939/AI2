import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 8080

// Simple CORS configuration
app.use(cors({
  origin: [
    'https://ai2-frontend-kccz.onrender.com',
    'https://devopsservices.in',
    'https://api.devopsservices.in',
    'https://www.devopsservices.in',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials: true
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT
  })
})

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString() 
  })
})

// Simple chat endpoint (without complex logic)
app.post('/api/chat', (req, res) => {
  const { userId, message } = req.body
  
  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' })
  }
  
  res.json({ 
    reply: `Hello! I'm LashivGPT. You said: "${message}". This is a test response.`,
    history: [
      { role: 'user', content: message, ts: Date.now() },
      { role: 'assistant', content: `Hello! I'm LashivGPT. You said: "${message}". This is a test response.`, ts: Date.now() }
    ]
  })
})

// Models endpoint
app.get('/api/models', (req, res) => {
  res.json({
    models: {
      "gemini-2.0-flash": {
        name: "LashivGPT Fast",
        description: "Quick and efficient responses"
      },
      "gemini-2.5-pro": {
        name: "LashivGPT Pro", 
        description: "Most advanced AI"
      },
      "gemini-1.5-pro": {
        name: "LashivGPT Standard",
        description: "Balanced performance"
      }
    },
    defaultModel: "gemini-2.0-flash"
  })
})

app.listen(PORT, () => {
  console.log(`Clean server listening on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`Test API: http://localhost:${PORT}/api/test`)
  console.log(`Models: http://localhost:${PORT}/api/models`)
})
