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
      config.urls.frontend, 
      'https://ai2-frontend-kccz.onrender.com',
      'https://devopsservices.in',
      'https://api.devopsservices.in',
      'https://www.devopsservices.in',
      /^http:\/\/localhost:\d+$/,
      /^https:\/\/.*\.onrender\.com$/
    ]

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// Add CORS headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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
  console.log(`Allowed Origins: ${allowedOrigins.join(', ')}`)
})


