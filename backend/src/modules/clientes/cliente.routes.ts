import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as clienteController from "./cliente.controller";

const router = Router();

router.use(autenticar);

router.get("/", autorizar("DONO", "GESTOR", "SUPORTE", "TECNICO"), asyncHandler(clienteController.listar));
router.get("/:id", autorizar("DONO", "GESTOR", "SUPORTE", "TECNICO"), asyncHandler(clienteController.buscarPorId));
// Abertura/edição de cadastro de cliente é função do Suporte (nível 2) para cima.
router.post("/", autorizar("DONO", "GESTOR", "SUPORTE"), asyncHandler(clienteController.criar));
router.put("/:id", autorizar("DONO", "GESTOR", "SUPORTE"), asyncHandler(clienteController.atualizar));
router.delete("/:id", autorizar("DONO"), asyncHandler(clienteController.remover));

export default router;
