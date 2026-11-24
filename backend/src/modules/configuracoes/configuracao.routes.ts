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

// Dados da empresa (PT3): leitura para qualquer usuário logado; alterar é
// decisão de gestão, como o fluxo de etapas. O portal público recebe nome e
// contato junto do acompanhamento da OS.
router.get("/empresa", autenticar, asyncHandler(configuracaoController.obterEmpresa));
router.put(
  "/empresa",
  autenticar,
  autorizar("DONO", "GESTOR"),
  asyncHandler(configuracaoController.salvarEmpresa)
);

export default router;
