import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./common/middleware/errorHandler";
import apiRoutes from "./routes/index";

const app = express();

// ─── Security & CORS ───────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// ─── Body Parsers ──────────────────────────────────────────────────────────────
// NOTE: /api/v1/payments/webhook uses raw body (configured in payment.routes.ts)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/v1", apiRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`🚀 Ecofy API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});

export default app;
