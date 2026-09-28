import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as tarefaCatalogoController from "./tarefaCatalogo.controller";

const router = Router();

router.use(autenticar);

// Listagem liberada para todos os papéis autenticados (alimenta o seletor de
// tarefas dentro da OS). A manutenção do catálogo é restrita a DONO/GESTOR.
router.get("/", asyncHandler(tarefaCatalogoController.listar));
router.post("/", autorizar("DONO", "GESTOR"), asyncHandler(tarefaCatalogoController.criar));
router.patch("/:id", autorizar("DONO", "GESTOR"), asyncHandler(tarefaCatalogoController.atualizar));
router.delete("/:id", autorizar("DONO", "GESTOR"), asyncHandler(tarefaCatalogoController.desativar));

export default router;
