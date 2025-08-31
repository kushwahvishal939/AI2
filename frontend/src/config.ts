// Frontend Configuration
export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://ai2-bm1g.onrender.com/api',
    timeout: 30000, // 30 seconds
  },
  
  // App Configuration
  app: {
    name: 'LashivGPT',
    version: '1.0.0',
    description: 'AI Chat Assistant for DevOps and Cloud Infrastructure',
  },
  
  // Feature Flags
  features: {
    imageGeneration: true,
    codeEditing: true,
    fileUpload: true,
    modelSelection: true,
  },
  
  // UI Configuration
  ui: {
    maxMessageLength: 10000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFileTypes: ['.txt', '.md', '.js', '.ts', '.py', '.sh', '.yaml', '.yml', '.json'],
  }
}

// Helper function to get API URL
export const getApiUrl = (endpoint: string = '') => {
  return `${config.api.baseUrl}${endpoint}`
}

// Helper function to check if running locally
export const isLocalDevelopment = () => {
  return import.meta.env.DEV || config.api.baseUrl.includes('localhost')
}
