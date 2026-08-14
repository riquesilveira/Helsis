export type StatusOS =
  | "RECEBIDO"
  | "DIAGNOSTICO"
  | "AGUARDANDO_PECA"
  | "EM_REPARO"
  | "AGUARDANDO_VALIDACAO"
  | "CONCLUIDO"
  | "CANCELADO";

// Os rótulos/ordem/ativação das etapas agora são configuráveis por empresa e
// vêm do backend via `useEtapasStatus` (com fallback estático em ETAPAS_PADRAO,
// em src/hooks/useEtapasStatus.tsx). Não redeclare listas de etapas aqui.

export type TipoOS = "CORRETIVA" | "PREVENTIVA";

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  documento?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  equipamentos?: Equipamento[];
}

export interface Equipamento {
  id: string;
  clienteId?: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  localInstalacao?: string;
  frequenciaManutencaoMeses?: number | null;
  ultimaManutencaoPreventiva?: string | null;
  proximaManutencaoPreventiva?: string | null;
  // Dados regulatórios (nicho de imagem médica)
  registroAnvisa?: string | null;
  responsavelTecnico?: string | null;
  dataUltimaCalibracao?: string | null;
  validadeCalibracao?: string | null;
}

export interface EquipamentoCatalogoItem {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
}

export type StatusManutencaoPreventiva = "ATRASADA" | "PROXIMA" | "EM_DIA";

export interface EquipamentoComManutencao extends Equipamento {
  cliente: Cliente;
  statusPreventiva: StatusManutencaoPreventiva;
}

export type TipoComissao = "PERCENTUAL" | "FIXO";

export interface Funcionario {
  id: string;
  cargo: string;
  salarioAtual: number;
  tipoComissao?: TipoComissao | null;
  valorComissao?: number | null;
  especialidades?: string[];
  usuario: { nome: string; email: string; papel?: PapelUsuario };
}

export interface StatusHistoricoItem {
  status: StatusOS;
  observacao?: string;
  criadoEm: string;
  tentativaNumero?: number;
}

export interface PecaCatalogo {
  id: string;
  nome: string;
  categoria?: string;
  garantiaPadraoMeses: number;
  precoUnitario?: number | null;
}

export interface PecaTrocadaItem {
  id: string;
  tipoServico: string;
  quantidade: number;
  tentativaNumero: number;
  resolveuProblema: boolean | null;
  garantiaAte: string | null;
  dataTroca: string;
  precoUnitario?: number | null;
  pecaCatalogo: PecaCatalogo;
}

export interface DeslocamentoItem {
  id: string;
  modalTransporte?: "CARRO" | "AVIAO" | null;
  origemCidade?: string | null;
  destinoCidade?: string | null;
  custoPassagem?: number | null;
  custoHospedagem?: number | null;
  custoAlimentacao?: number | null;
  diasViagem?: number | null;
}

export type TipoAnexo = "FOTO" | "LAUDO" | "OUTRO";

export interface AnexoItem {
  id: string;
  tipo: TipoAnexo;
  url: string; // caminho relativo servido pelo backend (/uploads/...)
  nomeArquivo: string;
  tamanhoBytes?: number | null;
  descricao?: string | null;
  criadoEm: string;
}

// Status de SLA contratual de uma OS (calculado no backend a partir do
// contrato aplicável ao cliente/equipamento).
export type StatusSla =
  | "SEM_CONTRATO"
  | "NO_PRAZO"
  | "ATRASADO"
  | "CUMPRIDO"
  | "DESCUMPRIDO";

export interface Sla {
  status: StatusSla;
  slaHorasResposta: number | null;
  prazoResposta: string | null;
  respondidoEm: string | null;
  horasRestantes: number | null;
  contratoId: string | null;
}

// Contrato de manutenção com SLA (por cliente e, opcionalmente, equipamento).
export interface Contrato {
  id: string;
  clienteId: string;
  equipamentoId?: string | null;
  numero?: string | null;
  slaHorasResposta: number;
  vigenciaInicio: string;
  vigenciaFim?: string | null;
  ativo: boolean;
  observacoes?: string | null;
  criadoEm: string;
  cliente?: Cliente;
  equipamento?: Equipamento | null;
}

// Diagnóstico codificado (Causa / Defeito / Solução) — catálogo padronizado
// escolhido por dropdown no fechamento do chamado.
export interface Causa {
  id: string;
  codigo: string;
  descricao: string;
}

export interface Defeito {
  id: string;
  codigo: string;
  descricao: string;
  tempoEstimadoMin?: number | null;
}

export interface Solucao {
  id: string;
  codigo: string;
  descricao: string;
  tempoEstimadoMin?: number | null;
}

export interface OrdemServico {
  id: string;
  numero: number;
  tipo: TipoOS;
  statusAtual: StatusOS;
  modalidade: "VISITA_TECNICA" | "OFICINA" | "REMOTO";
  descricaoProblema: string;
  numeroTentativas: number;
  resolvidoNaPrimeira: boolean | null;
  dataAgendada: string | null;
  dataAbertura: string;
  dataConclusao: string | null;
  atualizadoEm: string;
  valorMaoDeObra?: number | null;
  valorComissao?: number | null;
  causaId?: string | null;
  causa?: Causa | null;
  defeitoId?: string | null;
  defeito?: Defeito | null;
  solucaoId?: string | null;
  solucao?: Solucao | null;
  cliente: Cliente;
  equipamento: Equipamento;
  funcionario?: Funcionario | null;
  statusHistoricos: StatusHistoricoItem[];
  pecasTrocadas?: PecaTrocadaItem[];
  deslocamentos?: DeslocamentoItem[];
  anexos?: AnexoItem[];
  sla?: Sla;
}

export interface RotaFuncionario {
  agendadasParaData: OrdemServico[];
  outrasEmAberto: OrdemServico[];
}

export interface DesempenhoFuncionario {
  funcionarioId: string;
  nome: string;
  cargo: string;
  totalOrdensConcluidas: number;
  resolvidasNaPrimeiraTentativa: number;
  taxaResolucaoPrimeiraTentativa: number;
  mediaTentativasPorOrdem: number;
  tempoMedioResolucaoHoras: number | null;
  custoTotalDeslocamento: number;
  pecasTrocadasQueNaoResolveram: number;
  comissaoAcumulada: number;
}

export interface ItemComissaoResumo {
  ordemServicoId: string;
  numero: number;
  clienteNome: string;
  dataConclusao: string;
  valorMaoDeObra: number;
  valorComissao: number;
}

export interface ResumoMensal {
  funcionarioId: string;
  nome: string;
  email: string;
  cargo: string;
  mes: number;
  ano: number;
  salarioBase: number;
  tipoComissao: "PERCENTUAL" | "FIXO" | null;
  valorConfigComissao: number | null;
  atendimentos: ItemComissaoResumo[];
  totalComissoes: number;
  totalAPagar: number;
}

export interface NotificacaoItem {
  id: string;
  canal: "SMS" | "WHATSAPP";
  destinatario: string;
  mensagem: string;
  status: "ENVIADA" | "FALHOU";
  erro?: string;
  enviadaEm: string;
}

export interface RegistroPonto {
  id: string;
  funcionarioId: string;
  entrada: string;
  saida: string | null;
  criadoEm: string;
  // presente apenas na visão consolidada (gerente/dono)
  funcionario?: { usuario: { nome: string } };
}

export type PapelUsuario = "DONO" | "GESTOR" | "SUPORTE" | "TECNICO" | "CLIENTE";

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
}
