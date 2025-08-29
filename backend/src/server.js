import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRouter from "./routes.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: [/^http:\/\/localhost:\d+$/],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// Health
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "chat-backend" });
});

// Chat routes
app.use("/api", chatRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);
});


