import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { UPLOADS_DIR, UPLOADS_ROUTE } from "./lib/storage";
import "./lib/prisma"; // garante que o override de Decimal.toJSON seja aplicado

export const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Anexos de OS servidos estaticamente (fotos/laudos salvos em backend/uploads).
app.use(UPLOADS_ROUTE, express.static(UPLOADS_DIR));

app.use("/api", routes);

// Precisa ser o último middleware registrado
app.use(errorMiddleware);
