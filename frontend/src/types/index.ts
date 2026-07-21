export type StatusOS =
  | "RECEBIDO"
  | "DIAGNOSTICO"
  | "AGUARDANDO_PECA"
  | "EM_REPARO"
  | "AGUARDANDO_VALIDACAO"
  | "CONCLUIDO"
  | "CANCELADO";

export const ETAPAS_STATUS: { status: StatusOS; rotulo: string }[] = [
  { status: "RECEBIDO", rotulo: "Recebido" },
  { status: "DIAGNOSTICO", rotulo: "Diagnóstico" },
  { status: "AGUARDANDO_PECA", rotulo: "Aguardando peça" },
  { status: "EM_REPARO", rotulo: "Em reparo" },
  { status: "AGUARDANDO_VALIDACAO", rotulo: "Aguardando validação" },
  { status: "CONCLUIDO", rotulo: "Concluído" },
];

// Todas as opções que fazem sentido escolher ao AVANÇAR o status de uma OS
// (inclui CANCELADO, que não aparece na trilha visual da timeline).
export const OPCOES_STATUS: { status: StatusOS; rotulo: string }[] = [
  ...ETAPAS_STATUS,
  { status: "CANCELADO", rotulo: "Cancelado" },
];

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
  cliente: Cliente;
  equipamento: Equipamento;
  funcionario?: Funcionario | null;
  statusHistoricos: StatusHistoricoItem[];
  pecasTrocadas?: PecaTrocadaItem[];
  deslocamentos?: DeslocamentoItem[];
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

export type PapelUsuario = "DONO" | "GESTOR" | "SUPORTE" | "TECNICO" | "CLIENTE";

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
}
