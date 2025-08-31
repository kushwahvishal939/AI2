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

app.use(express.json())

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT
  })
})

app.listen(PORT, () => {
  console.log(`Test server listening on port ${PORT}`)
  console.log(`Test endpoint: http://localhost:${PORT}/test`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
