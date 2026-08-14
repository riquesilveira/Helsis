# Roadmap / plano de execução

> O que já existe (fase concluída, pra não reconstruir do zero por engano)
> e o que vem a seguir, em fases sugeridas. Isso é um plano, não uma lei —
> reordena livremente conforme a prioridade real do negócio mudar.

## Fase 0 — concluída

Fluxo ponta a ponta já funciona: cadastrar cliente → agendar preventiva ou
abrir corretiva → atender (com histórico de status e tentativas) →
notificar o cliente automaticamente → registrar peça trocada → fechar
financeiramente (mão de obra + comissão calculada) → avaliar desempenho →
gerar resumo mensal pra imprimir.

Especificamente, já está pronto:

- [x] Auth por papel (Dono/Gestor/Técnico/Cliente)
- [x] CRUD de clientes, equipamentos, funcionários, catálogo de peças
- [x] Ordens de serviço com trilha de status e múltiplas tentativas
- [x] Peça trocada com preço snapshot e indicador de "resolveu o problema"
- [x] Deslocamento (passagem/hospedagem/alimentação) no modelo de dados
- [x] Notificação automática ao cliente (Console e Twilio como providers)
- [x] Portal público de acompanhamento sem login
- [x] Manutenção preventiva com cálculo automático de atraso
- [x] Comissão por técnico (percentual ou fixo), incidindo só sobre mão de
      obra
- [x] Fechamento financeiro por OS (editável só por Dono/Gestor, só-leitura
      pro técnico)
- [x] Painel com cards financeiros (ícone + tendência vs. mês passado),
      gráfico de faturamento 30 dias, despesas por tipo, agenda do dia
- [x] Filtro de OS por status (aba) e período (dropdown + intervalo
      personalizado)
- [x] Desempenho por técnico + resumo mensal/contracheque imprimível
- [x] Seed com dados robustos (3 técnicos, 4 clientes, 5 equipamentos, ~11
      OS espalhadas pelos últimos 45 dias)

Removido nesta fase (não é lacuna, foi decisão): pedido de reavaliação
salarial / página "Desempenho e evolução".

## Fase 1 — ✅ concluída

Fechou as lacunas identificadas no PRD/modulação antes de crescer escopo.

- [x] **Diferença real entre Dono e Gestor** — resolvida virando uma
      hierarquia de 4 papéis (`DONO`/`GESTOR`/`SUPORTE`/`TECNICO`),
      diferenciados de fato no backend via `autorizar(...)` por rota (ex:
      abrir OS é do Suporte pra cima; conclusão/validação idem; fechamento
      financeiro só Dono/Gestor).
- [x] **Tela de "sem permissão"** — `SemPermissao.tsx`, usada pelo
      `RotaProtegidaPorPapel` no `App.tsx` quando o papel não bate.
- [x] **Formulário de deslocamento na interface** — CRUD completo (modal na
      tela da OS + rotas backend restritas a Dono/Gestor).

## Fase 2 — dados que faltam pro nicho ✅ concluída

- [x] **Dados regulatórios do equipamento**: `registroAnvisa`,
      `responsavelTecnico`, `dataUltimaCalibracao`, `validadeCalibracao` no
      Equipamento. Form em `ClienteDetail` (seção "Dados regulatórios") e
      alerta de calibração vencida/vencendo no card do equipamento.
- [x] **Contratos de manutenção com SLA**: model `Contrato`
      (cliente + equipamento opcional, `slaHorasResposta`, vigência, ativo).
      Módulo backend `contratos` (CRUD, gestão restrita a Dono/Gestor) e
      página `Contratos & SLA`. Cada OS traz um objeto `sla` calculado
      (`NO_PRAZO`/`ATRASADO`/`CUMPRIDO`/`DESCUMPRIDO`/`SEM_CONTRATO`),
      exibido como badge no detalhe e na lista de OS.
- [x] **Upload de fotos/laudos** na OS: model `Anexo`, binário salvo em
      `backend/uploads/os-<id>/` via `multer`, servido em `/uploads`.
      Seção "Anexos" na tela da OS (upload, thumbnail, download, excluir).
      Aceita imagem/PDF até 10 MB. ⚠️ storage local — não sobrevive a deploy
      serverless; migrar pra storage externo (S3/Blob) quando hospedar.

## Fase 3 — polimento operacional

- [ ] **Configuração de etapas de status por empresa** — hoje a trilha
      (`RECEBIDO → DIAGNOSTICO → ...`) é fixa no código; cada empresa que
      usar o sistema pode ter um fluxo ligeiramente diferente.
- [ ] **Outros provedores de notificação** (Zenvia, WhatsApp Cloud API da
      Meta) — a interface `ProvedorNotificacao` já existe, é só implementar
      e registrar na fábrica.
- [ ] **Code-splitting do frontend** — o build já avisa que o bundle passou
      de 500kB depois de adicionar `recharts`; vale `dynamic import()` nas
      rotas menos acessadas.

## Fase 4 — exploratório / não decidido ainda

Ideias que apareceram ao longo da construção mas não têm compromisso de
prioridade:

- Multi-empresa (multi-tenant)
- App mobile nativo
- Integração fiscal / nota fiscal
- Exportar resumo mensal também em PDF gerado no servidor (hoje é
  impressão via navegador, que já cobre o caso de uso, mas um PDF gerado
  no backend seria mais robusto pra automação/envio por e-mail)

## Como usar este arquivo

Ao terminar uma fase (ou parte dela), marca o item como feito e move a
descrição correspondente pra "Fase 0" com uma linha curta, do jeito que as
fases anteriores foram registradas — isso mantém o arquivo como histórico
real do que foi construído, não só uma lista de desejos.
