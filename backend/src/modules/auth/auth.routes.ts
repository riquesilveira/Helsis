import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar } from "../../middlewares/auth.middleware";
import {
  loginController,
  alterarSenhaController,
  atualizarPerfilController,
  perfilController,
} from "./auth.controller";

const router = Router();

router.post("/login", asyncHandler(loginController));

// Rotas autenticadas — perfil e senha do próprio usuário
router.get("/me", autenticar, asyncHandler(perfilController));
router.patch("/me", autenticar, asyncHandler(atualizarPerfilController));
router.post("/alterar-senha", autenticar, asyncHandler(alterarSenhaController));

export default router;
