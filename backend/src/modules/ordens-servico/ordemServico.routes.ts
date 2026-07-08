import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as osController from "./ordemServico.controller";

const router = Router();

// Rota pública: o cliente acompanha o status sem precisar logar,
// bastando o link/número da OS (igual rastreio de encomenda).
router.get("/:id/acompanhamento-publico", asyncHandler(osController.acompanhamentoPublico));

router.use(autenticar);

router.get("/", asyncHandler(osController.listar));
router.get("/:id", asyncHandler(osController.buscarPorId));
router.post("/", autorizar("DONO", "GESTOR", "TECNICO"), asyncHandler(osController.criar));
router.patch(
  "/:id/status",
  autorizar("DONO", "GESTOR", "TECNICO"),
  asyncHandler(osController.atualizarStatus)
);
router.post(
  "/:id/pecas",
  autorizar("DONO", "GESTOR", "TECNICO"),
  asyncHandler(osController.registrarPeca)
);
router.get(
  "/:id/notificacoes",
  autorizar("DONO", "GESTOR"),
  asyncHandler(osController.notificacoes)
);
router.patch(
  "/:id/financeiro",
  autorizar("DONO", "GESTOR"),
  asyncHandler(osController.atualizarFinanceiro)
);

// Deslocamentos — restritos a DONO e GESTOR (envolvem custo financeiro)
router.post(
  "/:id/deslocamentos",
  autorizar("DONO", "GESTOR"),
  asyncHandler(osController.registrarDeslocamento)
);
router.patch(
  "/:id/deslocamentos/:deslocamentoId",
  autorizar("DONO", "GESTOR"),
  asyncHandler(osController.atualizarDeslocamento)
);
router.delete(
  "/:id/deslocamentos/:deslocamentoId",
  autorizar("DONO", "GESTOR"),
  asyncHandler(osController.excluirDeslocamento)
);

export default router;
