import express from 'express'
import cors from 'cors'
import { config } from '../config.js'
import routes from './routes.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8080

// CORS configuration with environment variable support
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'https://ai2-frontend-kccz.onrender.com',
      'https://devopsservices.in',
      'https://api.devopsservices.in',
      'https://www.devopsservices.in',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8080'
    ]

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}))

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// API routes
app.use('/api', routes)

// Serve static files from data directory
app.use('/api/images', express.static(path.join(__dirname, '../data')))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    urls: config.urls
  })
})

app.listen(PORT, () => {
  console.log(`Backend listening on ${config.urls.backend}`)
  console.log(`Frontend URL: ${config.urls.frontend}`)
  console.log(`API Base URL: ${config.urls.api}`)
  console.log(`Allowed Origins: ${allowedOrigins.filter(origin => typeof origin === 'string').join(', ')}`)
  console.log(`Regex Patterns: ${allowedOrigins.filter(origin => origin instanceof RegExp).map(r => r.source).join(', ')}`)
})


