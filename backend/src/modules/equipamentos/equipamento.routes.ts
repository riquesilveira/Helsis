import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as equipamentoController from "./equipamento.controller";

const router = Router();

router.use(autenticar);

// Precisa vir antes de "/:id" para não ser interpretado como um id.
router.get("/manutencoes-preventivas", asyncHandler(equipamentoController.manutencoesPreventivas));

router.get("/", asyncHandler(equipamentoController.listar));
router.get("/:id", asyncHandler(equipamentoController.buscarPorId));
router.post("/", autorizar("DONO", "GESTOR", "TECNICO"), asyncHandler(equipamentoController.criar));
router.put("/:id", autorizar("DONO", "GESTOR", "TECNICO"), asyncHandler(equipamentoController.atualizar));

export default router;
