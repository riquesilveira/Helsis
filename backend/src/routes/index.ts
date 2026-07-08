import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import clienteRoutes from "../modules/clientes/cliente.routes";
import equipamentoRoutes from "../modules/equipamentos/equipamento.routes";
import funcionarioRoutes from "../modules/funcionarios/funcionario.routes";
import ordemServicoRoutes from "../modules/ordens-servico/ordemServico.routes";
import pecaRoutes from "../modules/pecas/peca.routes";
import desempenhoRoutes from "../modules/desempenho/desempenho.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/clientes", clienteRoutes);
router.use("/equipamentos", equipamentoRoutes);
router.use("/funcionarios", funcionarioRoutes);
router.use("/ordens-servico", ordemServicoRoutes);
router.use("/pecas", pecaRoutes);
router.use("/desempenho", desempenhoRoutes);

export default router;
