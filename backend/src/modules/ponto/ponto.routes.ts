import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as pontoController from "./ponto.controller";

const router = Router();

router.use(autenticar);

// Bater ponto é função de todo funcionário (técnico N1, suporte N2, gerente N3).
router.get("/atual", asyncHandler(pontoController.meuPontoAtual));
router.get("/meus", asyncHandler(pontoController.meusRegistros));
router.post("/entrada", asyncHandler(pontoController.baterEntrada));
router.post("/saida", asyncHandler(pontoController.baterSaida));

// Folha consolidada de todos os funcionários — só gerente/dono.
router.get("/", autorizar("DONO", "GESTOR"), asyncHandler(pontoController.listar));

export default router;
