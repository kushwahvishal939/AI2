import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 8080

// Enhanced CORS
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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Handle preflight requests
app.options('*', cors())

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
  const { userId, message, selectedModel } = req.body
  
  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' })
  }
  
  // Simple response based on message content
  let reply = "Hello! I'm LashivGPT, your DevOps and Cloud Infrastructure AI assistant. "
  
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    reply += "How can I help you with DevOps, Kubernetes, AWS, Azure, or GCP today?"
  } else if (message.toLowerCase().includes('kubernetes') || message.toLowerCase().includes('k8s')) {
    reply += "I can help you with Kubernetes! Topics include pods, services, deployments, ingress, Helm, operators, and more. What specific Kubernetes question do you have?"
  } else if (message.toLowerCase().includes('aws') || message.toLowerCase().includes('azure') || message.toLowerCase().includes('gcp')) {
    reply += "I can help you with cloud platforms! Whether it's AWS (EC2, EKS, Lambda), Azure (AKS, Azure DevOps), or GCP (GKE, Cloud Run), I'm here to assist with your cloud infrastructure needs."
  } else if (message.toLowerCase().includes('docker')) {
    reply += "I can help you with Docker! Topics include containers, images, Dockerfile, docker-compose, registry, and container orchestration."
  } else if (message.toLowerCase().includes('ci/cd') || message.toLowerCase().includes('pipeline')) {
    reply += "I can help you with CI/CD pipelines! Whether it's Jenkins, GitLab CI, GitHub Actions, Azure DevOps, or AWS CodePipeline, I can guide you through best practices and implementation."
  } else {
    reply += "I'm specialized in DevOps, Platform Engineering, and Cloud Infrastructure. I can help with CI/CD, Kubernetes, cloud platforms (AWS/Azure/GCP), security, monitoring, and more. What would you like to know?"
  }
  
  const newHistory = [
    { role: 'user', content: message, ts: Date.now() },
    { role: 'assistant', content: reply, ts: Date.now() }
  ]
  
  res.json({ 
    reply: reply,
    history: newHistory
  })
})

// History endpoints
app.get('/api/history/:userId', (req, res) => {
  const { userId } = req.params
  res.json({ history: [] })
})

app.delete('/api/history/:userId', (req, res) => {
  const { userId } = req.params
  res.json({ ok: true })
})

// Image generation endpoint
app.post('/api/generate-image', (req, res) => {
  res.json({ 
    reply: "Image generation is temporarily disabled. Please use text chat.",
    history: []
  })
})

app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`)
})
