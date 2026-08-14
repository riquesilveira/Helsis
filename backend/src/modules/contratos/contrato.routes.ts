import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as contratoController from "./contrato.controller";

const router = Router();

router.use(autenticar);

// Contratos envolvem SLA e valores contratuais — gestão restrita a DONO/GESTOR.
// Leitura liberada também para SUPORTE/TECNICO (precisam ver o prazo do SLA).
router.get(
  "/",
  autorizar("DONO", "GESTOR", "SUPORTE", "TECNICO"),
  asyncHandler(contratoController.listar)
);
router.get(
  "/:id",
  autorizar("DONO", "GESTOR", "SUPORTE", "TECNICO"),
  asyncHandler(contratoController.buscarPorId)
);
router.post("/", autorizar("DONO", "GESTOR"), asyncHandler(contratoController.criar));
router.put("/:id", autorizar("DONO", "GESTOR"), asyncHandler(contratoController.atualizar));
router.delete("/:id", autorizar("DONO", "GESTOR"), asyncHandler(contratoController.excluir));

export default router;
