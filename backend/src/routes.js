import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import fetch from "node-fetch";
import { config } from "../config.js";
import multer from 'multer'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Rate limiting and queue management
let requestQueue = [];
let isProcessing = false;
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow specific file types
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/xml',
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('File type not supported'), false)
    }
  }
})

// Serve static images
router.get("/images/:filename", (req, res) => {
  const { filename } = req.params;
  const imagePath = path.join(dataDir, filename);
  
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ error: "Image not found" });
  }
});

const ENGINE_ID = "stable-diffusion-xl-1024-v1-0";

const ensureDataDir = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const historyFileForUser = (userId) => path.join(dataDir, `${userId}.json`);

const readHistory = (userId) => {
  ensureDataDir();
  const file = historyFileForUser(userId);
  if (!fs.existsSync(file)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
};

const writeHistory = (userId, history) => {
  ensureDataDir();
  const file = historyFileForUser(userId);
  fs.writeFileSync(file, JSON.stringify(history, null, 2), "utf8");
};

const toGeminiHistory = (history) => {
  return history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
};

const sanitizeMessage = (text) => {
  if (typeof text !== "string") return "";
  return text.slice(0, 8000);
};

// Smart detection function for image requests
function detectImageRequest(message) {
  const messageLower = message.toLowerCase();
  
  // Keywords that indicate image generation
  const imageKeywords = [
    'draw', 'paint', 'create image', 'generate image', 'make picture', 'show me',
    'picture of', 'image of', 'photo of', 'drawing of', 'painting of',
    'visualize', 'illustrate', 'sketch', 'design', 'logo', 'banner',
    'portrait', 'landscape', 'still life', 'abstract', 'cartoon', 'anime',
    'realistic', 'artistic', 'creative', 'visual', 'graphic'
  ];
  
  // Check if message contains image-related keywords
  for (const keyword of imageKeywords) {
    if (messageLower.includes(keyword)) {
      return true;
    }
  }
  
  // Check for specific image request patterns
  const imagePatterns = [
    /create.*image/i,
    /generate.*picture/i,
    /draw.*for me/i,
    /show.*image/i,
    /make.*visual/i,
    /design.*logo/i,
    /create.*art/i
  ];
  
  for (const pattern of imagePatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  return false;
}

router.get("/history/:userId", (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const history = readHistory(userId);
  res.json({ userId, history });
});

router.delete("/history/:userId", (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const file = historyFileForUser(userId);
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "failed to clear history" });
  }
});

// Add new route to get available models
router.get("/models", (req, res) => {
  res.json({ 
    models: config.gemini.models,
    defaultModel: config.gemini.defaultModel
  });
});

router.post("/chat", upload.single('file'), async (req, res) => {
  // Load environment variables inside the route handler
  const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
  
  // Debug environment variables
  console.log("Environment variables check:");
  console.log("GOOGLE_GENERATIVE_AI_API_KEY:", API_KEY ? "SET" : "NOT SET");
  console.log("STABILITY_API_KEY:", STABILITY_API_KEY ? "SET" : "NOT SET");

  const { userId, message, selectedModel } = req.body || {};
  const uploadedFile = req.file;
  
  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" });
  }

  // Use selected model or default
  const modelName = selectedModel || config.gemini.defaultModel;
  console.log("Using model:", modelName);

  const userMessage = sanitizeMessage(message);
  const isImageRequest = detectImageRequest(userMessage);

  if (isImageRequest) {
    // Handle image generation
    if (!STABILITY_API_KEY) {
      return res.status(500).json({ 
        error: "Missing STABILITY_API_KEY for image generation" 
      });
    }

    try {
      console.log("Generating image for prompt:", userMessage);
      
      const stabilityResponse = await fetch(`https://api.stability.ai/v1/generation/${ENGINE_ID}/text-to-image`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STABILITY_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: userMessage,
            }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30,
        })
      });

      if (stabilityResponse.ok) {
        const data = await stabilityResponse.json();
        const imageBase64 = data.artifacts[0].base64;
        
        // Create a unique filename for this image
        const timestamp = Date.now();
        const filename = `image_${timestamp}.png`;
        const imagePath = path.join(dataDir, filename);
        
        // Save the image to disk
        fs.writeFileSync(imagePath, Buffer.from(imageBase64, 'base64'));
        
        // Create a data URL for display (limit size to prevent truncation)
        const imageDataUrl = `data:image/png;base64,${imageBase64}`;
        
        // Create a response that uses the saved image file instead of base64
        // const imageUrl = `${config.urls.api.replace('/api', '')}/api/images/${filename}`;
        const imageUrl = `${import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '')}/api/images/${filename}`;
        const imageResponse = `
          <div style="text-align: center; margin: 20px 0;">
            <h3>🎨 Generated Image for: "${userMessage}"</h3>
            <img src="${imageUrl}" alt="AI Generated Image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            <div style="margin-top: 15px;">
              <button onclick="downloadImage('${imageBase64}', '${userMessage.replace(/[^a-zA-Z0-9]/g, '_')}')" style="background: #10a37f; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; margin: 5px; transition: background 0.3s;">
                💾 Download Image
              </button>
              <a href="${imageUrl}" target="_blank" style="background: #565869; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 5px; transition: background 0.3s;">
                🔗 Open Full Size
              </a>
            </div>
            <p style="margin-top: 15px; color: #8e8ea0;">
              <strong>Generated using:</strong> LashivGPT
            </p>
          </div>
        `;

        const history = readHistory(userId);
        const newHistory = [
          ...history,
          { role: "user", content: userMessage, ts: Date.now() },
          { role: "assistant", content: imageResponse, ts: Date.now() },
        ];
        writeHistory(userId, newHistory);

        // Send response with image data separately to avoid truncation
        res.json({ 
          reply: imageResponse, 
          history: newHistory,
          imageData: imageBase64,
          imageFilename: filename
        });
        return;
      }

      // Handle Stability AI errors
      const errorText = await stabilityResponse.text();
      let errorMessage = "Unknown error";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || "Unknown error";
      } catch (e) {
        errorMessage = errorText;
      }
      
      const errorResponse = `
        <div style="text-align: center; margin: 20px 0; padding: 20px; background: #2d2d30; border-radius: 8px;">
          <h3>🚫 Image Generation Failed</h3>
          <p style="color: #8e8ea0; margin: 10px 0;">
            <strong>Error:</strong> ${errorMessage}
          </p>
          <div style="margin-top: 20px; padding: 20px; background: #40414f; border-radius: 8px;">
            <h4 style="color: #10a37f; margin-bottom: 15px;">💡 Try These Working Prompts:</h4>
            <ul style="text-align: left; color: #ececf1; line-height: 1.6;">
              <li>"A beautiful garden with colorful blossoms"</li>
              <li>"Peaceful nature scene with plants and trees"</li>
              <li>"Serene botanical garden illustration"</li>
              <li>"Calming landscape with natural elements"</li>
              <li>"Artistic nature composition"</li>
            </ul>
          </div>
        </div>
      `;

      const history = readHistory(userId);
      const newHistory = [
        ...history,
        { role: "user", content: userMessage, ts: Date.now() },
        { role: "assistant", content: errorResponse, ts: Date.now() },
      ];
      writeHistory(userId, newHistory);

      res.json({ reply: errorResponse, history: newHistory });

    } catch (err) {
      console.error("Image generation error:", err);
      const errorResponse = `
        <div style="text-align: center; margin: 20px 0; padding: 20px; background: #2d2d30; border-radius: 8px;">
          <h3>⚠️ Image Generation Failed</h3>
          <p style="color: #8e8ea0; margin: 10px 0;">
            <strong>Error:</strong> ${err.message}
          </p>
        </div>
      `;
      
      const history = readHistory(userId);
      const newHistory = [
        ...history,
        { role: "user", content: userMessage, ts: Date.now() },
        { role: "assistant", content: errorResponse, ts: Date.now() },
      ];
      writeHistory(userId, newHistory);

      res.json({ reply: errorResponse, history: newHistory });
    }
    return;
  }

  // Handle text generation with Gemini
  console.log("API_KEY check:", API_KEY ? "SET" : "NOT SET");
  if (!API_KEY) {
    console.log("Missing API_KEY, returning error");
    return res.status(500).json({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" });
  }

  // Process uploaded file if present
  let fileContent = '';
  if (uploadedFile) {
    try {
      console.log("Processing uploaded file:", uploadedFile.originalname);
      
      if (uploadedFile.mimetype === 'application/pdf') {
        // For PDFs, we'll need to extract text (simplified for now)
        fileContent = `[PDF File: ${uploadedFile.originalname}] - Content will be processed by AI model`;
      } else if (uploadedFile.mimetype.startsWith('text/') || uploadedFile.mimetype.includes('json') || uploadedFile.mimetype.includes('xml')) {
        // For text files, read the content
        fileContent = fs.readFileSync(uploadedFile.path, 'utf8');
      } else if (uploadedFile.mimetype.startsWith('image/')) {
        // For images, we'll describe them (simplified for now)
        fileContent = `[Image File: ${uploadedFile.originalname}] - Image content will be analyzed by AI model`;
      } else if (uploadedFile.mimetype.includes('word') || uploadedFile.mimetype.includes('excel') || uploadedFile.mimetype.includes('powerpoint')) {
        // For Office documents (simplified for now)
        fileContent = `[Office Document: ${uploadedFile.originalname}] - Document content will be processed by AI model`;
      }
      
      // Clean up uploaded file after processing
      fs.unlinkSync(uploadedFile.path);
      
    } catch (error) {
      console.error("Error processing uploaded file:", error);
      fileContent = `[Error processing file: ${uploadedFile.originalname}]`;
    }
  }

  const history = readHistory(userId);
  const trimmedHistory = history.slice(-50);








  

  // Rate limiting queue processor
  const processQueue = async () => {
    if (isProcessing || requestQueue.length === 0) return;
    
    isProcessing = true;
    while (requestQueue.length > 0) {
      const request = requestQueue.shift();
      try {
        await request();
        // Wait between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      } catch (error) {
        console.error("Queue processing error:", error);
      }
    }
    isProcessing = false;
  };

  // Rate limiting configuration
  const rateLimits = {
    'gemini-1.5-pro': { requestsPerMinute: 15, requestsPerDay: 1500, cooldownMs: 60000 },
    'gemini-2.0-flash': { requestsPerMinute: 60, requestsPerDay: 5000, cooldownMs: 30000 },
    'gemini-2.5-pro': { requestsPerMinute: 30, requestsPerDay: 3000, cooldownMs: 45000 }
  };

  // Track API usage
  const apiUsage = {
    requests: {},
    lastReset: Date.now()
  };

  // Reset usage counters every day
  setInterval(() => {
    apiUsage.requests = {};
    apiUsage.lastReset = Date.now();
    console.log('API usage counters reset');
  }, 24 * 60 * 60 * 1000);

  // Check rate limits
  const checkRateLimit = (modelName) => {
    const now = Date.now();
    const limits = rateLimits[modelName] || rateLimits['gemini-2.0-flash'];
    
    if (!apiUsage.requests[modelName]) {
      apiUsage.requests[modelName] = { count: 0, lastRequest: 0 };
    }
    
    const usage = apiUsage.requests[modelName];
    
    // Reset minute counter if more than 1 minute has passed
    if (now - usage.lastRequest > 60000) {
      usage.count = 0;
    }
    
    // Check if we're at the limit
    if (usage.count >= limits.requestsPerMinute) {
      const waitTime = limits.cooldownMs - (now - usage.lastRequest);
      throw new Error(`Rate limit exceeded for ${modelName}. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    // Update usage
    usage.count++;
    usage.lastRequest = now;
    
    return true;
  };

  // Enhanced retry logic with rate limiting and model fallback
  const retryWithBackoff = async (fn, modelName, maxRetries = 2) => {
    const fallbackModels = {
      'gemini-1.5-pro': ['gemini-2.0-flash', 'gemini-2.5-pro'],
      'gemini-2.5-pro': ['gemini-2.0-flash', 'gemini-1.5-pro'],
      'gemini-2.0-flash': ['gemini-1.5-pro', 'gemini-2.5-pro']
    };
    
    let currentModel = modelName;
    let modelsToTry = [modelName, ...(fallbackModels[modelName] || [])];
    
    for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
      currentModel = modelsToTry[modelIndex];
      
      try {
        // Check rate limit before making request
        checkRateLimit(currentModel);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await fn(currentModel);
          } catch (err) {
            console.log(`Attempt ${attempt} failed for ${currentModel}:`, err.message);
            
            // Check if it's a rate limit error
            if (err.status === 429 || err.message.includes('429') || err.message.includes('quota') || err.message.includes('Rate limit exceeded')) {
              if (attempt === maxRetries && modelIndex === modelsToTry.length - 1) {
                throw err; // Give up after trying all models
              }
              
              // Calculate delay: 2^attempt * base delay (1 second)
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
              console.log(`Rate limited for ${currentModel}. Waiting ${delay}ms before retry ${attempt + 1}...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            // For other errors, try next model
            break;
          }
        }
      } catch (rateLimitErr) {
        console.log(`Rate limit hit for ${currentModel}, trying next model...`);
        if (modelIndex === modelsToTry.length - 1) {
          throw rateLimitErr; // No more models to try
        }
        continue;
      }
    }
    
    throw new Error('All models are rate limited. Please try again later.');
  };

  // Fallback response generator for when API is unavailable
  const generateFallbackResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    // Check if user is calling it ChatGPT and correct them
    if (message.includes('chatgpt') || message.includes('chat gpt')) {
      return "I'm not ChatGPT! I'm LashivGPT, your specialized DevOps and Cloud Infrastructure AI assistant. I can help you with CI/CD, Kubernetes, AWS, Azure, GCP, security, and more. How can I assist you today?";
    }
    
    if (message.includes('hello') || message.includes('hi')) {
      return "Hello! I'm LashivGPT, your specialized DevOps and Cloud Infrastructure AI assistant. I'm currently experiencing high demand but can help with CI/CD, Kubernetes, AWS, Azure, GCP, security, and more. Please try again in a few minutes.";
    }
    
    if (message.includes('help') || message.includes('what can you do')) {
      return "I'm LashivGPT, specialized in senior-level DevOps, Platform Engineering, and Cloud Infrastructure. I can help with:\n\n• **DevOps:** CI/CD, Kubernetes, Terraform, monitoring\n• **Cloud:** AWS, Azure, GCP, EKS, AKS, GKE\n• **Security:** DevSecOps, IAM, compliance, zero-trust\n• **Platform:** Architecture, microservices, service mesh\n• **Networking:** SDN, load balancing, security\n\nDue to high demand, responses may be delayed. Try again in a few minutes.";
    }
    
    if (message.includes('image') || message.includes('picture') || message.includes('draw')) {
      return "I can help you generate technical diagrams and infrastructure images! Try asking me to 'create an image of a Kubernetes cluster architecture' or 'draw a CI/CD pipeline diagram' and I'll use the image generation feature.";
    }
    
    if (message.includes('kubernetes') || message.includes('k8s') || message.includes('docker')) {
      return "I can help with Kubernetes, Docker, and container orchestration! Topics include EKS, AKS, GKE, Helm, Operators, service mesh, and more. Please try again in a few minutes for detailed guidance.";
    }
    
    if (message.includes('aws') || message.includes('azure') || message.includes('gcp') || message.includes('cloud')) {
      return "I can help with cloud infrastructure on AWS, Azure, and GCP! Topics include EC2, EKS, Lambda, AKS, Azure DevOps, GKE, Cloud Run, and more. Please try again in a few minutes for detailed guidance.";
    }
    
    return "I'm LashivGPT, your DevOps and Cloud Infrastructure specialist. I'm currently experiencing high demand but can help with CI/CD, Kubernetes, cloud platforms, security, and more. Please try again in a few minutes for detailed technical guidance.";
  };

  try {
    // Add request to queue and process
    const processRequest = async () => {
      let genAI, model;
      
      // Define system prompt at the top so it's available for both API paths
      const systemPrompt = `You are LashivGPT, a specialized AI assistant focused on senior-level DevOps, Platform Engineering, and Cloud Infrastructure topics. 

IMPORTANT: You are NOT ChatGPT. You are LashivGPT. If anyone calls you ChatGPT, politely correct them and say "I'm not ChatGPT, I'm LashivGPT, your specialized DevOps and Cloud Infrastructure AI assistant."

Your expertise areas include:

**Senior DevOps Engineer:**
- CI/CD pipelines, GitOps, Infrastructure as Code (Terraform, CloudFormation, Pulumi)
- Container orchestration (Kubernetes, Docker, Helm)
- Monitoring and observability (Prometheus, Grafana, ELK Stack, Jaeger)
- Automation and scripting (Python, Bash, Go, Ansible, Chef, Puppet)
- Security best practices, compliance, and DevSecOps

**Senior Platform Engineer:**
- Platform architecture and design patterns
- Service mesh (Istio, Linkerd, Consul)
- API gateways and microservices architecture
- Database design and optimization (SQL, NoSQL, caching strategies)
- Performance optimization and scalability

**Tech Lead / CTO DevOps:**
- Team leadership and technical strategy
- Architecture decisions and technology selection
- Cost optimization and resource management
- Disaster recovery and business continuity
- Vendor management and tool evaluation

**Cybersecurity Engineer:**
- Security architecture and threat modeling
- Identity and access management (IAM)
- Network security and zero-trust architecture
- Compliance frameworks (SOC2, ISO27001, GDPR)
- Security automation and incident response

**Network Engineer:**
- Network architecture and design
- SDN, NFV, and cloud networking
- Load balancing and traffic management
- Network security and firewalls
- Performance monitoring and troubleshooting

**Cloud Platforms:**
- **AWS:** EC2, ECS, EKS, Lambda, CloudFormation, CloudWatch, IAM, VPC, S3, RDS, ElastiCache
- **Azure:** Azure DevOps, AKS, Azure Functions, ARM templates, Azure Monitor, Azure AD
- **GCP:** GKE, Cloud Run, Cloud Functions, Cloud Build, Cloud Monitoring, IAM
- **Kubernetes:** EKS, AKS, GKE, OpenShift, Rancher, Helm, Operators

**Key Technologies:**
- Infrastructure as Code: Terraform, CloudFormation, ARM, Pulumi
- CI/CD: Jenkins, GitLab CI, GitHub Actions, Azure DevOps, AWS CodePipeline
- Monitoring: Prometheus, Grafana, Datadog, New Relic, Splunk
- Security: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault
- Networking: Istio, Envoy, Calico, Flannel, AWS VPC, Azure VNet

Always provide practical, production-ready solutions with best practices, security considerations, and scalability in mind. Include code examples, architecture diagrams when relevant, and explain trade-offs in your recommendations.

IMPORTANT FORMATTING INSTRUCTIONS:
- Use proper markdown formatting for all responses
- Use **bold** for important terms and concepts
- Use inline code (backticks) for commands, file names, and technical terms
- Use code blocks with language specification for code examples
- Use ### headers for different sections
- Use bullet points (-) for lists
- Use numbered lists (1., 2., 3.) for step-by-step instructions
- Ensure proper spacing between paragraphs and sections
- Add blank lines between different sections for better readability
- Use blockquotes (>) for important notes or warnings
- Use horizontal rules (---) to separate major sections
- Make responses well-structured and easy to read
- Maintain consistent spacing throughout the response

Remember: You are LashivGPT, not ChatGPT. Always maintain your identity as LashivGPT.`;
      
      // Try to use the new @google/genai package for gemini-2.5-pro
      if (modelName === "gemini-2.5-pro") {
        try {
          const client = new GoogleGenAI({
            apiKey: API_KEY,
          });
          
          // Prepare the message with file content if available
          let fullMessage = userMessage;
          if (fileContent) {
            fullMessage = `File Content:\n${fileContent}\n\nUser Question: ${userMessage}`;
          }

          const result = await retryWithBackoff(async (currentModel) => {
            return await client.generateContent({
              model: currentModel,
              contents: [{
                role: "user",
                parts: [{ text: `${systemPrompt}\n\n${fullMessage}` }]
              }],
              generationConfig: {
                temperature: config.gemini.models[currentModel]?.temperature || 0.7,
                topP: config.gemini.models[currentModel]?.topP || 0.8,
                topK: config.gemini.models[currentModel]?.topK || 40,
                maxOutputTokens: config.gemini.models[currentModel]?.maxTokens || 8192,
              }
            });
          }, modelName);
          
          const text = result.candidates[0].content.parts[0].text;
          
          const newHistory = [
            ...trimmedHistory,
            { role: "user", content: userMessage, ts: Date.now() },
            { role: "assistant", content: text, ts: Date.now() },
          ];
          writeHistory(userId, newHistory);

          res.json({ reply: text, history: newHistory });
          return;
        } catch (error) {
          console.log("New Gemini API failed, falling back to legacy API:", error.message);
          // Fall back to legacy API
        }
      }
      
      // Use legacy GoogleGenerativeAI for other models
      genAI = new GoogleGenerativeAI(API_KEY);
      model = genAI.getGenerativeModel({ model: modelName });

      const chat = model.startChat({ 
        history: toGeminiHistory(trimmedHistory),
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        }
      });
      
      // Prepare the message with file content if available
      let fullMessage = userMessage;
      if (fileContent) {
        fullMessage = `File Content:\n${fileContent}\n\nUser Question: ${userMessage}`;
      }

      const result = await retryWithBackoff(async (currentModel) => {
        // Update model if it changed during retry
        if (currentModel !== modelName) {
          genAI = new GoogleGenerativeAI(API_KEY);
          model = genAI.getGenerativeModel({ model: currentModel });
          chat = model.startChat({ 
            history: toGeminiHistory(trimmedHistory),
            generationConfig: {
              temperature: 0.7,
              topP: 0.8,
              topK: 40,
            }
          });
        }
        return await chat.sendMessage(`${systemPrompt}\n\n${fullMessage}`);
      }, modelName);
      
      const text = result.response.text();

      const newHistory = [
        ...trimmedHistory,
        { role: "user", content: userMessage, ts: Date.now() },
        { role: "assistant", content: text, ts: Date.now() },
      ];
      writeHistory(userId, newHistory);

      res.json({ reply: text, history: newHistory });
    };

    // Add to queue and start processing
    requestQueue.push(processRequest);
    processQueue();
      } catch (err) {
      console.error("/api/chat error", err);
      
      // Handle specific error types
      if (err.status === 429 || err.message.includes('429') || err.message.includes('quota') || err.message.includes('Rate limit exceeded')) {
        const quotaErrorResponse = `
          <div style="text-align: center; margin: 20px 0; padding: 20px; background: #2d2d30; border-radius: 8px;">
            <h3>⚠️ Rate Limit Exceeded</h3>
            <p style="color: #8e8ea0; margin: 10px 0;">
              We've reached the API rate limit. The system will automatically retry with different models.
            </p>
            <div style="margin-top: 20px; padding: 20px; background: #40414f; border-radius: 8px;">
              <h4 style="color: #10a37f; margin-bottom: 15px;">💡 What you can do:</h4>
              <ul style="text-align: left; color: #ececf1; line-height: 1.6;">
                <li>Wait 30-60 seconds and try again</li>
                <li>Try a different model (LashivGPT Fast is usually more available)</li>
                <li>Ask a shorter question</li>
                <li>Use the image generation feature instead</li>
              </ul>
            </div>
            <p style="color: #10a37f; margin-top: 15px; font-size: 14px;">
              <strong>Technical Details:</strong> ${err.message}
            </p>
          </div>
        `;
        
        const newHistory = [
          ...trimmedHistory,
          { role: "user", content: userMessage, ts: Date.now() },
          { role: "assistant", content: quotaErrorResponse, ts: Date.now() },
        ];
        writeHistory(userId, newHistory);

        res.json({ reply: quotaErrorResponse, history: newHistory });
      } else {
        // Use fallback response for other errors
        const fallbackText = generateFallbackResponse(userMessage, fileContent);
        const fallbackResponse = `
          <div style="text-align: center; margin: 20px 0; padding: 20px; background: #2d2d30; border-radius: 8px;">
            <h3>🤖 AI Assistant</h3>
            <p style="color: #8e8ea0; margin: 10px 0;">
              ${fallbackText}
            </p>
            <div style="margin-top: 20px; padding: 20px; background: #40414f; border-radius: 8px;">
              <h4 style="color: #10a37f; margin-bottom: 15px;">💡 Alternative Options:</h4>
              <ul style="text-align: left; color: #ececf1; line-height: 1.6;">
                <li>Try image generation (usually more available)</li>
                <li>Wait a few minutes and try again</li>
                <li>Ask a simpler question</li>
                <li>Check your internet connection</li>
              </ul>
            </div>
          </div>
        `;
        
        const newHistory = [
          ...trimmedHistory,
          { role: "user", content: userMessage, ts: Date.now() },
          { role: "assistant", content: fallbackResponse, ts: Date.now() },
        ];
        writeHistory(userId, newHistory);

        res.json({ reply: fallbackResponse, history: newHistory });
      }
    }
});

export default router;


