import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar } from "../../middlewares/auth.middleware";
import {
  loginController,
  alterarSenhaController,
  atualizarPerfilController,
  perfilController,
} from "./auth.controller";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de login. Aguarde 15 minutos e tente novamente." },
});

router.post("/login", loginLimiter, asyncHandler(loginController));

// Rotas autenticadas — perfil e senha do próprio usuário
router.get("/me", autenticar, asyncHandler(perfilController));
router.patch("/me", autenticar, asyncHandler(atualizarPerfilController));
router.post("/alterar-senha", autenticar, asyncHandler(alterarSenhaController));

export default router;
