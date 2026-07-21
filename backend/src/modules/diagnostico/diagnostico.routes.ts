import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as diagnosticoController from "./diagnostico.controller";

const router = Router();

router.use(autenticar);

// Listagem é liberada para todos os papéis autenticados (alimenta os dropdowns
// do fechamento). A manutenção do catálogo é restrita a DONO/GESTOR.
router.get("/causas", asyncHandler(diagnosticoController.listarCausas));
router.post("/causas", autorizar("DONO", "GESTOR"), asyncHandler(diagnosticoController.criarCausa));
router.patch("/causas/:id", autorizar("DONO", "GESTOR"), asyncHandler(diagnosticoController.atualizarCausa));
router.delete("/causas/:id", autorizar("DONO", "GESTOR"), asyncHandler(diagnosticoController.desativarCausa));

router.get("/defeitos", asyncHandler(diagnosticoController.listarDefeitos));
router.post("/defeitos", autorizar("DONO", "GESTOR"), asyncHandler(diagnosticoController.criarDefeito));
router.patch("/defeitos/:id", autorizar("DONO", "GESTOR"), asyncHandler(diagnosticoController.atualizarDefeito));
router.delete("/defeitos/:id", autorizar("DONO", "GESTOR"), asyncHandler(diagnosticoController.desativarDefeito));

router.get("/solucoes", asyncHandler(diagnosticoController.listarSolucoes));
router.post("/solucoes", autorizar("DONO", "GESTOR"), asyncHandler(diagnosticoController.criarSolucao));
router.patch("/solucoes/:id", autorizar("DONO", "GESTOR"), asyncHandler(diagnosticoController.atualizarSolucao));
router.delete("/solucoes/:id", autorizar("DONO", "GESTOR"), asyncHandler(diagnosticoController.desativarSolucao));

export default router;
