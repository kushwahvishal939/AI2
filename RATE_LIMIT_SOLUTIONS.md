# Rate Limiting Solutions for Lashiv AI

## 🚨 Current Issue: 429 Too Many Requests

You're experiencing rate limiting from Google's Gemini API. Here are **permanent solutions**:

## 🔧 Immediate Solutions (Already Implemented)

### 1. **Automatic Retry with Exponential Backoff**
- ✅ Automatically retries failed requests
- ✅ Waits 1s, 2s, 4s between retries (max 30s)
- ✅ Handles rate limits gracefully

### 2. **Request Queue System**
- ✅ Queues requests to prevent overwhelming API
- ✅ 2-second delay between requests
- ✅ Prevents concurrent API calls

### 3. **Smart Fallback Responses**
- ✅ Provides helpful responses when API is unavailable
- ✅ Suggests alternatives (image generation)
- ✅ Maintains user experience

## 🎯 Permanent Solutions

### Option 1: Upgrade Google AI API Plan
```bash
# Visit: https://ai.google.dev/
# 1. Go to Google AI Studio
# 2. Upgrade to paid plan
# 3. Get higher rate limits
```

**Benefits:**
- Higher rate limits (up to 1000 requests/minute)
- Priority support
- Better reliability

### Option 2: Add Multiple API Keys
```javascript
// In your .env file, add multiple keys:
GOOGLE_GENERATIVE_AI_API_KEY=your_primary_key
GOOGLE_GENERATIVE_AI_API_KEY_2=your_backup_key
GOOGLE_GENERATIVE_AI_API_KEY_3=your_third_key
```

### Option 3: Implement API Key Rotation
```javascript
// Add this to routes.js
const API_KEYS = [
  process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_2,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;

const getNextAPIKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return API_KEYS[currentKeyIndex];
};
```

### Option 4: Add Alternative AI Providers
```javascript
// Add OpenAI as backup
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Use when Gemini fails
const useOpenAI = async (message) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
    }),
  });
  return response.json();
};
```

## 🛠️ Configuration Options

### Adjust Rate Limits
```javascript
// In config.js
export const config = {
  rateLimit: {
    requestsPerMinute: 10, // Reduce this if still hitting limits
    delayBetweenRequests: 3000, // Increase delay
    queueMaxSize: 5, // Reduce queue size
  },
};
```

### Enable Debug Mode
```javascript
// In config.js
export const config = {
  errors: {
    showDetailedErrors: true, // See exact error messages
    logErrors: true,
  }
};
```

## 📊 Monitoring Usage

### Check API Usage
```bash
# Visit Google AI Studio Dashboard
# https://aistudio.google.com/app/apikey
# Monitor your usage and limits
```

### Add Usage Tracking
```javascript
// Add to routes.js
let requestCount = 0;
const startTime = Date.now();

const logUsage = () => {
  const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
  const rate = requestCount / elapsed;
  console.log(`Requests per minute: ${rate.toFixed(2)}`);
};
```

## 🚀 Best Practices

### 1. **Implement Caching**
```javascript
// Cache common responses
const responseCache = new Map();

const getCachedResponse = (message) => {
  return responseCache.get(message.toLowerCase());
};

const cacheResponse = (message, response) => {
  responseCache.set(message.toLowerCase(), response);
  // Clear old entries after 1 hour
  setTimeout(() => responseCache.delete(message.toLowerCase()), 3600000);
};
```

### 2. **Use Webhooks for Long Responses**
```javascript
// For long-running requests
const createWebhook = (userId, messageId) => {
  // Send immediate response
  res.json({ status: 'processing', webhook: `/webhook/${messageId}` });
  
  // Process in background
  processInBackground(userId, messageId);
};
```

### 3. **Implement Request Prioritization**
```javascript
const priorityQueue = {
  high: [], // Urgent requests
  normal: [], // Regular requests
  low: [], // Non-urgent requests
};
```

## 🔍 Troubleshooting

### Check Current Status
```bash
# Test API directly
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Monitor Logs
```bash
# Watch backend logs
cd backend && npm run dev
# Look for rate limit messages
```

## 📞 Support

If you continue experiencing issues:

1. **Check Google AI Status**: https://status.ai.google.dev/
2. **Review API Documentation**: https://ai.google.dev/docs/quotas
3. **Contact Google Support**: Through AI Studio dashboard

## 🎉 Success Metrics

Your implementation is working when:
- ✅ No more 429 errors
- ✅ Users get helpful responses even during high load
- ✅ Image generation still works
- ✅ Queue system prevents API overload

---

**Remember**: The current implementation already handles most rate limiting gracefully. These additional solutions provide extra reliability for production use.
