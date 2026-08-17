import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as configuracaoController from "./configuracao.controller";

const router = Router();

// Leitura das etapas é PÚBLICA: o portal de acompanhamento do cliente
// (sem login) também precisa dos rótulos configurados. Não há nada sensível
// aqui — só nomes/ordem/ativação das etapas de status.
router.get("/etapas", asyncHandler(configuracaoController.listarEtapas));

// Alterar a configuração do fluxo é decisão de gestão — só DONO/GESTOR.
router.put(
  "/etapas",
  autenticar,
  autorizar("DONO", "GESTOR"),
  asyncHandler(configuracaoController.atualizarEtapas)
);

export default router;
