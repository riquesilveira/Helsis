import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as desempenhoController from "./desempenho.controller";

const router = Router();

router.use(autenticar);

// Precisa vir antes de "/:id" para não ser interpretado como um id.
router.get("/me", autorizar("TECNICO"), asyncHandler(desempenhoController.meuDesempenho));

router.use(autorizar("DONO", "GESTOR"));
router.get("/ranking", asyncHandler(desempenhoController.ranking));
// Comparativo de tarefas cronometradas — precisa vir antes de "/:id".
router.get("/comparativo-tarefas", asyncHandler(desempenhoController.comparativoTarefas));
router.get("/:id/resumo-mensal", asyncHandler(desempenhoController.resumoMensal));
router.get("/:id/tarefas", asyncHandler(desempenhoController.historicoTarefas));
router.get("/:id", asyncHandler(desempenhoController.desempenhoPorFuncionario));

export default router;
