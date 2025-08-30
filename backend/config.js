// API Configuration and Rate Limiting Settings
export const config = {
  // URL Configuration
  urls: {
    backend: process.env.BACKEND_URL || 'http://localhost:8080',
    frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
    api: process.env.API_BASE_URL || 'http://localhost:8080/api',
  },
  
  // Gemini API Settings
  gemini: {
    models: {
      "gemini-2.0-flash": {
        name: "LashivGPT Fast",
        description: "Quick and efficient responses for fast interactions",
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
      "gemini-2.5-pro": {
        name: "LashivGPT Pro",
        description: "Most advanced AI with enhanced reasoning capabilities",
        maxTokens: 32768,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
      "gemini-1.5-pro": {
        name: "LashivGPT Standard",
        description: "Balanced performance with good cost efficiency",
        maxTokens: 16384,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    },
    defaultModel: "gemini-2.0-flash",
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
  },
  
  // Rate Limiting
  rateLimit: {
    requestsPerMinute: 15, // Conservative limit
    delayBetweenRequests: 2000, // 2 seconds
    queueMaxSize: 10,
  },
  
  // Fallback Settings
  fallback: {
    enabled: true,
    useLocalResponses: true,
  },
  
  // Error Handling
  errors: {
    showDetailedErrors: false, // Set to true for debugging
    logErrors: true,
  }
};

// Alternative API endpoints (for future use)
export const alternativeAPIs = {
  // You can add other AI APIs here as fallbacks
  openai: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
  },
  // Add more as needed
};

// Local response templates for when API is unavailable
export const localResponses = {
  greeting: "Hello! I'm currently experiencing high demand. I'll be back to full functionality shortly. In the meantime, you can try generating images or ask me again in a few minutes.",
  
  help: "I can help with various tasks including answering questions, generating images, and providing information. Due to current high demand, responses may be delayed. You can also try image generation which might be more available.",
  
  image: "I can help you generate images! Try asking me to 'create an image of...' or 'draw a picture of...' and I'll use the image generation feature.",
  
  default: "I'm currently experiencing high demand and may not be able to provide a full response right now. Please try again in a few minutes, or try generating an image instead. Thank you for your patience!",
  
  rateLimit: "We've reached the API rate limit. Please try again in a few minutes. You can also try generating images which usually have different limits.",
};
