import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./common/middleware/errorHandler";
import apiRoutes from "./routes/index";

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: false, // useful if serving images/files
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// ─── Body Parsers ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── Health Check (important for deployment) ─────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/v1", apiRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;