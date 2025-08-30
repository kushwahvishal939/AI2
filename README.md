## AI Chat (React + Tailwind + Express + Gemini)

### Setup

#### 1. Backend Environment Configuration
Create `.env` in `backend/` directory:

```env
# API Keys
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
STABILITY_API_KEY=your_stability_key_here

# Server Configuration
PORT=8080

# URL Configuration
BACKEND_URL=http://localhost:8080
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:8080/api

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### 2. Frontend Environment Configuration
Create `.env.local` in `frontend/` directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8080/api
```

### Run

- Backend:

```bash
cd backend
npm install
npm run dev
```

- Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` to use the chat. The app stores per-user chat history under `backend/data/{userId}.json`.

### Production Deployment

For production hosting, update the environment variables:

**Backend (.env):**
```env
BACKEND_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
API_BASE_URL=https://your-backend-domain.com/api
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

**Frontend (.env.local):**
```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

This setup allows you to easily switch between local development and production hosting by just updating the environment variables!


