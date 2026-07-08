# Modulação — arquitetura do sistema

> Como as peças se encaixam. Ler depois do `PRD.md` (que explica o *porquê*)
> e antes do `ROADMAP.md` (que explica *o que vem a seguir*).

## Stack

- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + Vite + TypeScript + Tailwind, `recharts` (gráfico do
  painel) e `lucide-react` (ícones)
- Fonte: Inter. Paleta: grafite (neutro) + teal (cor de ação).

## Módulos do backend (`backend/src/modules/`)

| Módulo | Responsabilidade | Observação |
|---|---|---|
| `auth` | Login, emissão de JWT | Papel (`PapelUsuario`) embutido no token |
| `clientes` | CRUD de clientes | Inclui `equipamentos` no retorno |
| `equipamentos` | CRUD + cálculo de manutenção preventiva | `GET /manutencoes-preventivas` precisa vir **antes** de `/:id` no router |
| `funcionarios` | CRUD de técnicos, salário, comissão, rota do dia | `atualizarSalario`/`atualizarComissao` restritos a Dono; `buscarFuncionarioPorUsuarioId` resolve o funcionário a partir do usuário logado — nunca de um id livre vindo do cliente |
| `ordens-servico` | Fluxo completo de OS: status, peça trocada, fechamento financeiro | `listarOrdensServico` inclui `pecasTrocadas` e `deslocamentos` — necessário pro painel calcular faturamento/despesas sem N chamadas extras |
| `pecas` | Catálogo de peças (com preço padrão) | |
| `desempenho` | Métricas por técnico, ranking, **resumo mensal (contracheque)** | `resumo-mensal` precisa vir antes de `/:id` no router, mesmo motivo do módulo de equipamentos |
| `notificacoes` | Envio ao cliente via provider plugável | Sem controller/rota própria — chamado internamente por `ordens-servico` no create/update de status. Provider escolhido por `NOTIFICATION_PROVIDER` no `.env` (`console` ou `twilio`) |

Módulo removido nesta fase: **`pedidos-aumento`** (era a antiga "solicitação
de reavaliação salarial" / página "Desempenho e evolução"). Removido por
completo — rotas, service, model do banco (`PedidoAumento`) — a pedido
explícito, não só escondido da UI. Se algo parecido for reconstruído no
futuro, é um módulo novo, não uma restauração.

## Páginas do frontend (`frontend/src/pages/`)

| Rota | Componente | Quem acessa |
|---|---|---|
| `/` | `Dashboard` | todos |
| `/ordens-servico` | `OrdensServicoList` | todos |
| `/ordens-servico/nova` | `NovaOS` | todos |
| `/ordens-servico/:id` | `OrdemServicoDetail` | todos (fechamento financeiro só aparece editável pra Dono/Gestor; técnico vê versão só-leitura) |
| `/manutencoes-preventivas` | `ManutencoesPreventivas` | todos |
| `/clientes`, `/clientes/:id` | `ClientesList`, `ClienteDetail` | todos |
| `/funcionarios` | `FuncionariosList` | Dono/Gestor |
| `/funcionarios/:id` | `FuncionarioDesempenho` | Dono/Gestor |
| `/funcionarios/:id/rota` | `RotaFuncionario` | Dono/Gestor |
| `/funcionarios/:id/resumo` | `ResumoMensalFuncionario` | Dono/Gestor — layout com CSS de impressão (`print:hidden` na sidebar) |
| `/minha-rota` | `MinhaRota` | Técnico (resolve o próprio id via usuário logado) |
| `/acompanhar/:id` | `AcompanharOS` | público, sem login |

Restrição de papel na sidebar é só **visual** hoje (esconde o link) — a
segurança de verdade está no backend (middleware `autorizar(...)`). Uma
pessoa digitando a URL restrita direto não é bloqueada com uma tela de "sem
permissão"; a API que rejeita, e a tela fica travada em "Carregando...".
Isso é uma lacuna conhecida, não uma decisão.

## Modelo de dados (entidades principais)

`Usuario` (1:1) `Funcionario` — `Cliente` (1:N) `Equipamento` — `Equipamento`
(1:N) `OrdemServico` — `OrdemServico` (1:N) `StatusHistorico`, `PecaTrocada`,
`Deslocamento`, `Notificacao` — `PecaCatalogo` (1:N) `PecaTrocada`.

Campos que existem por causa de uma decisão de negócio específica, não óbvia
só olhando o schema:

- `OrdemServico.atualizadoEm` — usado pra detectar OS "esquecida" (sem
  atualização há 3+ dias) no painel. É o campo automático do Prisma
  (`@updatedAt`), não um campo de negócio dedicado — funciona porque toda
  mudança de status ou fechamento financeiro passa por `update()`.
- `PecaTrocada.precoUnitario` e `Deslocamento.custo*` — snapshot no momento
  do evento, independente do preço atual no catálogo ou da config atual do
  técnico.
- `Funcionario.tipoComissao` / `valorComissao` — nulo é um estado válido
  (técnico só-salário, sem comissão).
- `StatusOS` hoje é: `RECEBIDO`, `DIAGNOSTICO`, `AGUARDANDO_PECA`,
  `EM_REPARO`, `CONCLUIDO`, `CANCELADO`. `EM_TESTE` e `ENTREGUE` existiram e
  foram removidos — juntar "teste" dentro de "em reparo" e não ter uma
  etapa de "entrega" separada de "concluído" fazia mais sentido pro modelo
  de atendimento no local do cliente (sem uma etapa de "retirada" como
  numa oficina).

## Padrões que se repetem (vale seguir em código novo)

1. **Rota específica antes de rota com `:id`** no Express — já mordeu duas
   vezes (`manutencoes-preventivas` e `resumo-mensal`).
2. **Snapshot, não referência viva** — qualquer valor financeiro
   (preço, comissão, salário no resumo mensal) é copiado no momento do
   evento, nunca recalculado a partir da config atual depois do fato.
3. **Fire-and-forget pra notificação** — nunca `await` o envio dentro do
   fluxo principal da requisição.
4. **Funcionário resolve a própria identidade pelo token**, nunca por um
   `:id` que o próprio funcionário poderia manipular (`buscarFuncionarioPorUsuarioId`).
5. **Tipos do frontend espelham o `include` do Prisma** — toda vez que um
   `include` novo é adicionado numa query do backend (ex: `pecasTrocadas`,
   `deslocamentos`), o tipo TypeScript correspondente no frontend
   (`frontend/src/types/index.ts`) precisa ganhar o campo opcional
   equivalente, senão o dado existe na API mas o frontend não sabe que ele
   existe.
