import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as equipamentoController from "./equipamento.controller";

const router = Router();

router.use(autenticar);

// Precisa vir antes de "/:id" para não ser interpretado como um id.
// Agenda de manutenções preventivas expõe o parque de TODOS os clientes —
// é uma visão de planejamento, restrita à gestão/suporte.
router.get(
  "/manutencoes-preventivas",
  autorizar("DONO", "GESTOR", "SUPORTE"),
  asyncHandler(equipamentoController.manutencoesPreventivas)
);
// Catálogo de tipos de equipamento (não expõe cliente) — alimenta o cadastro.
router.get("/catalogo", asyncHandler(equipamentoController.catalogo));

// Cadastro e navegação do parque de equipamentos é função da gestão/suporte.
// O técnico já vê o equipamento da OS dele embutido no detalhe da ordem.
router.get("/", autorizar("DONO", "GESTOR", "SUPORTE"), asyncHandler(equipamentoController.listar));
router.get("/:id", autorizar("DONO", "GESTOR", "SUPORTE"), asyncHandler(equipamentoController.buscarPorId));
router.post("/", autorizar("DONO", "GESTOR", "SUPORTE"), asyncHandler(equipamentoController.criar));
router.put("/:id", autorizar("DONO", "GESTOR", "SUPORTE"), asyncHandler(equipamentoController.atualizar));

export default router;
