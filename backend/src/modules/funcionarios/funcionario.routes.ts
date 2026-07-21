import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as funcionarioController from "./funcionario.controller";

const router = Router();

router.use(autenticar);

// Precisa vir antes de "/:id" para não ser interpretado como um id.
router.get("/me/rota", autorizar("TECNICO"), asyncHandler(funcionarioController.minhaRota));

// Suporte (nível 2) precisa da lista de técnicos para designar chamados.
router.get("/", autorizar("DONO", "GESTOR", "SUPORTE"), asyncHandler(funcionarioController.listar));
router.get("/:id", autorizar("DONO", "GESTOR"), asyncHandler(funcionarioController.buscarPorId));
router.get("/:id/rota", autorizar("DONO", "GESTOR"), asyncHandler(funcionarioController.rota));
router.post("/", autorizar("DONO"), asyncHandler(funcionarioController.criar));
router.patch("/:id", autorizar("DONO"), asyncHandler(funcionarioController.atualizar));
router.patch(
  "/:id/salario",
  autorizar("DONO"),
  asyncHandler(funcionarioController.atualizarSalario)
);
router.patch(
  "/:id/comissao",
  autorizar("DONO"),
  asyncHandler(funcionarioController.atualizarComissao)
);

export default router;
