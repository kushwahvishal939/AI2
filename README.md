## AI Chat (React + Tailwind + Express + Gemini)

### Setup
1) Create `.env` in `backend/` root or project root with:
```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
PORT=8080
```

### Run
- Backend:
```
cd backend
npm install
npm run dev
```
- Frontend:
```
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` to use the chat. The app stores per-user chat history under `backend/data/{userId}.json`.


