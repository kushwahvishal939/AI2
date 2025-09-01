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

// In-memory storage for chat history (in production, use a database)
const chatHistory = new Map()

app.post('/api/chat', (req, res) => {
  const { userId, message, selectedModel } = req.body
  
  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' })
  }
  
  // Get existing history for this user
  const existingHistory = chatHistory.get(userId) || []
  
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
  } else if (message.toLowerCase().includes('terraform')) {
    reply += "I can help you with Terraform! Terraform is an Infrastructure as Code (IaC) tool that allows you to define and provision infrastructure using declarative configuration files. Key concepts include providers, resources, modules, state management, and workspaces. What specific Terraform question do you have?"
  } else {
    reply += "I'm specialized in DevOps, Platform Engineering, and Cloud Infrastructure. I can help with CI/CD, Kubernetes, cloud platforms (AWS/Azure/GCP), security, monitoring, and more. What would you like to know?"
  }
  
  // Add new messages to existing history
  const newHistory = [
    ...existingHistory,
    { role: 'user', content: message, ts: Date.now() },
    { role: 'assistant', content: reply, ts: Date.now() }
  ]
  
  // Store updated history
  chatHistory.set(userId, newHistory)
  
  res.json({ 
    reply: reply,
    history: newHistory
  })
})

app.get('/api/history/:userId', (req, res) => {
  const { userId } = req.params
  const history = chatHistory.get(userId) || []
  res.json({ history: history })
})

app.delete('/api/history/:userId', (req, res) => {
  const { userId } = req.params
  chatHistory.delete(userId)
  res.json({ ok: true })
})

app.post('/api/generate-image', (req, res) => {
  const { userId, message } = req.body
  
  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' })
  }
  
  // Get existing history for this user
  const existingHistory = chatHistory.get(userId) || []
  
  const reply = "Image generation is temporarily disabled. Please use text chat for now."
  
  // Add new messages to existing history
  const newHistory = [
    ...existingHistory,
    { role: 'user', content: message, ts: Date.now() },
    { role: 'assistant', content: reply, ts: Date.now() }
  ]
  
  // Store updated history
  chatHistory.set(userId, newHistory)
  
  res.json({ 
    reply: reply,
    history: newHistory
  })
})

app.listen(PORT, () => {
  console.log(`Ultra-simple server running on port ${PORT}`)
})
