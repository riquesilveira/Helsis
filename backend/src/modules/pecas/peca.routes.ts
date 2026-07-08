import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { autenticar, autorizar } from "../../middlewares/auth.middleware";
import * as pecaController from "./peca.controller";

const router = Router();

router.use(autenticar);

router.get("/", asyncHandler(pecaController.listar));
router.post("/", autorizar("DONO", "GESTOR"), asyncHandler(pecaController.criar));

export default router;
