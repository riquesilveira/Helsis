import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as contratoController from "./contrato.controller";

const router = Router();

router.use(autenticar);

// Contratos envolvem SLA e valores contratuais — gestão restrita a DONO/GESTOR.
// Leitura liberada também para SUPORTE (precisa ver o prazo do SLA ao atender).
// TECNICO fica de fora: o status de SLA da OS dele já vem no detalhe da ordem,
// sem expor os valores contratuais.
router.get(
  "/",
  autorizar("DONO", "GESTOR", "SUPORTE"),
  asyncHandler(contratoController.listar)
);
router.get(
  "/:id",
  autorizar("DONO", "GESTOR", "SUPORTE"),
  asyncHandler(contratoController.buscarPorId)
);
router.post("/", autorizar("DONO", "GESTOR"), asyncHandler(contratoController.criar));
router.put("/:id", autorizar("DONO", "GESTOR"), asyncHandler(contratoController.atualizar));
router.delete("/:id", autorizar("DONO", "GESTOR"), asyncHandler(contratoController.excluir));

export default router;
