# Gestor de Assistência Técnica

> **Antes de planejar ou construir qualquer coisa nova**: leia `PRD.md`
> (visão e requisitos), `docs/MODULACAO.md` (arquitetura) e
> `docs/ROADMAP.md` (o que já foi decidido pras próximas etapas). Se estiver
> usando Claude Code, o `CLAUDE.md` na raiz já aponta pra esses três
> automaticamente a cada sessão.

Sistema de gestão para empresas que fazem manutenção de equipamentos de
diagnóstico por imagem — ressonância magnética, tomografia computadorizada,
raio-X, mamografia e equipamentos similares. Cobre:

- **Ordens de serviço** com linha do tempo de status que o cliente (hospital
  ou clínica) acompanha sem precisar de login (como um rastreio de entrega).
- **Registro de peças trocadas** por OS, com controle de garantia e de quantas
  tentativas/peças erradas foram usadas até resolver o problema — importante
  quando as peças são caras e especializadas, como bobinas e tubos de raio-X.
- **Desempenho de técnicos** calculado a partir do histórico real: taxa de
  acerto na 1ª visita, média de tentativas, custo de deslocamento/hospedagem
  — relevante quando o atendimento frequentemente exige viagem (o técnico
  mora em um estado, o hospital fica em outro).

## Estrutura

```
gestor-assistencia-tecnica/
├── backend/     # API em Node.js + Express + TypeScript + Prisma (PostgreSQL)
└── frontend/    # App em React + Vite + TypeScript + Tailwind
```

## Como rodar

### 1. Backend

```bash
cd backend
cp .env.example .env      # ajuste DATABASE_URL e JWT_SECRET
npm install
npm run prisma:migrate    # cria as tabelas no banco
npm run seed               # popula dados de teste — 3 técnicos, 4 clientes,
                            # 5 equipamentos e ~11 OS espalhadas pelos
                            # últimos 45 dias (login: dono@empresa.com / 123456)
npm run dev                # sobe a API em http://localhost:3333
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                # sobe o app em http://localhost:5173
```

## O que já está pronto

- Modelo de dados completo (`backend/prisma/schema.prisma`): usuários, clientes,
  equipamentos, ordens de serviço, histórico de status, peças e deslocamentos.
- Autenticação por JWT com papéis (`DONO`, `GESTOR`, `TECNICO`, `CLIENTE`).
- CRUD de clientes, equipamentos e funcionários.
- Fluxo completo de OS: abrir chamado → mudar status → registrar peça trocada
  → concluir (com cálculo automático de "resolveu na primeira?").
- Cálculo de desempenho por técnico.
- **Resumo mensal (contracheque)** por técnico (`/funcionarios/:id/resumo`): salário
  base + comissão detalhada atendimento por atendimento (nº da OS, cliente,
  valor da mão de obra, comissão) daquele mês específico, com navegação
  entre meses e um total a receber no fim. Layout pensado pra impressão —
  o botão "Imprimir" usa `window.print()` com CSS específico que esconde a
  barra lateral e os controles, deixando só o resumo limpo na folha (ou no
  PDF, se a pessoa escolher "salvar como PDF" na caixa de impressão do
  navegador). Acessível a partir da tela de desempenho do funcionário,
  restrito a dono/gestor.
- Tela pública de acompanhamento (`/acompanhar/:id`) que o cliente acessa sem
  login.
- Painel interno **focado em valores, não em métricas de avaliação**: 4
  cards com ícone e indicador de tendência vs mês passado (tickets abertos,
  faturamento do mês, ticket médio do mês, despesas mensais — salários
  fixos de todos os técnicos + comissões do mês + custo de deslocamento do
  mês), um gráfico de faturamento dos últimos 30 dias, um painel de
  despesas por tipo no mês (salários, comissões, passagem aérea, hotel,
  alimentação), e a agenda do dia de cada técnico (quantos atendimentos e
  qual o próximo). Taxa de acerto e demais métricas de avaliação ficam na
  tela de cada funcionário — fazem mais sentido ali do que no primeiro
  olhar do dia. Usa `recharts` para o gráfico e `lucide-react` para os
  ícones.
- **Formulários funcionais na interface:**
  - Cadastro de cliente (`/clientes`) e de equipamento (`/clientes/:id`).
  - Abertura de nova OS (`/ordens-servico/nova`), com seleção de cliente,
    equipamento, técnico e modalidade de atendimento.
  - Atualização de status da OS direto na tela de detalhe, com opção de
    marcar "nova tentativa" (quando uma peça trocada não resolveu e o
    técnico precisa tentar de novo).
  - Registro de peça trocada na OS, com cadastro rápido de peça nova no
    catálogo quando ela ainda não existe.
- **Notificação automática ao cliente** a cada mudança de status (abertura,
  diagnóstico, aguardando peça, etc.), com link direto para a tela pública
  de acompanhamento. Funciona em dois modos:
  - `console` (padrão): não envia nada de verdade, só imprime a mensagem no
    log do backend — assim o sistema funciona sem nenhuma credencial.
  - `twilio`: envia de verdade por SMS ou WhatsApp via Twilio. Basta trocar
    `NOTIFICATION_PROVIDER=twilio` no `.env` e preencher as credenciais
    (veja `backend/.env.example`).
  - Todo envio (sucesso ou falha) fica registrado e visível na própria tela
    da OS, em "Notificações enviadas ao cliente".
- **Manutenção preventiva agendada** (`/manutencoes-preventivas`): cada
  equipamento pode ter uma frequência de manutenção (em meses) definida no
  cadastro. A tela mostra todos os equipamentos com plano ativo, ordenados
  pelos mais urgentes, com status **Atrasada** / **Próxima** (30 dias) /
  **Em dia**. Uma OS pode ser aberta como `CORRETIVA` (por causa de um
  problema) ou `PREVENTIVA` (manutenção agendada, sem problema relatado).
  Quando uma OS preventiva é concluída, o sistema recalcula sozinho a
  próxima data prevista a partir da frequência configurada — o dono não
  precisa lembrar de reagendar manualmente. O painel principal mostra a
  contagem de manutenções atrasadas.
- **Rota do dia por técnico** (`/funcionarios/:id/rota` para o dono,
  `/minha-rota` para o próprio técnico): ao abrir uma OS, agora dá pra
  definir a data agendada da visita. Clicando num técnico no ranking do
  painel, o dono vê a rota dele — quais clientes, o que cada um solicitou,
  e (pra quem já foi atendido) um resumo do que foi feito e quais peças
  foram trocadas. Tem um seletor de data pra ver outros dias, e uma seção
  separada com OS em aberto que ainda não têm data marcada, pra nada ficar
  escondido. O técnico tem a mesma visão da própria rota, só que restrita
  a si mesmo (o backend resolve quem é o técnico a partir do login, nunca
  de um id livre).
- **Comissão e fechamento financeiro da OS**: cada técnico pode ter uma
  configuração de comissão — percentual sobre a mão de obra, valor fixo
  por atendimento concluído, ou nenhuma (só salário fixo). Configurável na
  tela de desempenho do funcionário (`/funcionarios/:id`), junto com o
  salário e a comissão acumulada até agora. Na tela da OS, um card de
  "Fechamento financeiro" mostra o valor das peças (somado automaticamente
  do catálogo), um campo pra digitar a mão de obra, o valor total, e a
  comissão do técnico já calculada sozinha a partir da configuração dele —
  mas editável, caso um atendimento específico precise de ajuste manual.
  **A comissão incide só sobre a mão de obra, nunca sobre peça** (peça é
  custo repassado ao cliente). O preço de cada peça é um "snapshot" no
  momento da troca — se o preço no catálogo mudar depois, atendimentos já
  registrados não são afetados retroativamente.

## Próximos passos sugeridos

Isso já cobre o fluxo ponta a ponta (cadastrar cliente → agendar preventiva ou
abrir corretiva → atender → notificar o cliente automaticamente → concluir →
avaliar desempenho). Direções pra evoluir a partir daqui:

1. **Dados regulatórios do equipamento** (registro ANVISA, certificado de
   calibração, responsável técnico): importante pra esse nicho de imagem
   médica, ainda não está no modelo de dados.
2. **Contratos de manutenção com SLA**: tempo de resposta contratual por
   cliente/equipamento, pra saber se um atendimento estourou o prazo
   combinado.
3. **Configuração por empresa**: hoje as etapas de status são fixas no código
   (`RECEBIDO → DIAGNOSTICO → ...`); se cada empresa precisar de etapas
   diferentes, isso vira uma tabela configurável.
4. **Upload de fotos/laudos** na OS (ex: foto da peça trocada).
5. **Registro de deslocamento** (passagem/hospedagem) pela interface — hoje
   só existe no modelo de dados e no seed.
6. **Outros provedores de notificação** (Zenvia, WhatsApp Cloud API da Meta):
   basta implementar a interface `ProvedorNotificacao` em
   `backend/src/modules/notificacoes/providers/` e adicionar a opção na
   fábrica em `notificacao.service.ts`.

Me chama quando quiser detalhar qualquer um desses pontos — a estrutura já
está pronta pra crescer nessa direção.
