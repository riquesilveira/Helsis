import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as clienteController from "./cliente.controller";

const router = Router();

router.use(autenticar);

router.get("/", autorizar("DONO", "GESTOR", "TECNICO"), asyncHandler(clienteController.listar));
router.get("/:id", autorizar("DONO", "GESTOR", "TECNICO"), asyncHandler(clienteController.buscarPorId));
router.post("/", autorizar("DONO", "GESTOR"), asyncHandler(clienteController.criar));
router.put("/:id", autorizar("DONO", "GESTOR"), asyncHandler(clienteController.atualizar));
router.delete("/:id", autorizar("DONO"), asyncHandler(clienteController.remover));

export default router;
