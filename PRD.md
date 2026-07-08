# PRD — Gestor de Assistência Técnica

> Documento de referência do produto. Antes de planejar ou construir qualquer
> coisa nova neste sistema, vale reler este arquivo, `docs/MODULACAO.md` e
> `docs/ROADMAP.md` — nessa ordem: **por que** existe → **como** está
> estruturado → **o que vem** a seguir.

## 1. Visão do produto

Sistema de gestão para empresas que fazem manutenção de equipamentos de
diagnóstico por imagem — ressonância magnética, tomografia computadorizada,
raio-X, mamografia, ultrassom. É um nicho onde:

- O atendimento normalmente acontece **no local do cliente** (hospital,
  clínica), não numa oficina — o equipamento não sai do lugar.
- Os técnicos frequentemente **viajam** entre estados (passagem, hotel,
  alimentação viram custo real do atendimento, não só mão de obra).
- Peças são caras e específicas (bobina de ressonância, tubo de raio-X),
  então rastrear o que foi trocado e se resolveu o problema importa.
- O cliente (hospital/clínica) quer visibilidade do andamento sem precisar
  ligar toda hora.

O problema que o sistema resolve: falta de rastreabilidade do atendimento
do início ao fim, ausência de critério objetivo pra avaliar técnicos e
decidir remuneração, e nenhuma visibilidade financeira real (quanto entra,
quanto sai, com o quê) pro dono da empresa.

## 2. Personas

| Papel | O que faz no sistema |
|---|---|
| **Dono** (`DONO`) | Acompanha financeiro (painel), aprova/configura comissão e salário, vê desempenho da equipe, gera resumo mensal, cadastra clientes/equipamentos/peças. |
| **Gestor** (`GESTOR`) | ⚠️ Hoje tem **exatamente as mesmas permissões que Dono** em todo o sistema — o papel existe no modelo de dados mas nenhuma regra ainda diferencia os dois. Se a ideia é ter uma hierarquia real (ex: Gestor não vê salário, ou não configura comissão), isso ainda precisa ser desenhado e implementado. |
| **Técnico** (`TECNICO`) | Vê e atualiza sua própria rota do dia, muda status de OS, registra peça trocada, vê o próprio desempenho, vê a própria comissão calculada em cada atendimento (só leitura). |
| **Cliente** | Acompanha o status do próprio chamado por um link público, sem login (`/acompanhar/:id`). Recebe notificação (SMS/WhatsApp) a cada mudança de status. |

## 3. Objetivos do produto

1. Rastrear cada ordem de serviço do recebimento até a conclusão, com
   histórico completo de status e de quantas tentativas foram necessárias.
2. Calcular desempenho de técnico de forma objetiva (taxa de acerto na 1ª
   visita, tempo médio de resolução) — base pra decisão de remuneração, não
   achismo.
3. Calcular comissão automaticamente por atendimento (percentual sobre mão
   de obra, ou valor fixo — configurável por técnico), sem incidir sobre
   peça (peça é custo repassado ao cliente).
4. Dar ao dono visibilidade financeira real: faturamento do mês, ticket
   médio, despesas por tipo (salário/comissão/passagem/hotel/alimentação),
   tendência vs. mês anterior, tudo num único painel.
5. Notificar o cliente automaticamente a cada mudança de status, sem
   trabalho manual do técnico ou do dono.
6. Gerenciar manutenção **preventiva** agendada (não só corretiva reativa),
   com alerta de atraso.
7. Gerar um resumo mensal por técnico (salário + comissão detalhada,
   atendimento por atendimento) pronto pra imprimir/enviar — sem precisar
   de planilha paralela.

## 4. Requisitos funcionais (visão por área)

### Ordens de serviço
- Abrir OS vinculada a cliente + equipamento, corretiva ou preventiva.
- Trilha de status: Recebido → Diagnóstico → Aguardando peça → Em reparo →
  Concluído (mais Cancelado, disponível em qualquer ponto). Ver
  `docs/MODULACAO.md` pra entender por que "Em teste" e "Entregue" foram
  removidos dessa trilha.
- Registrar peça trocada (com preço, snapshot no momento da troca) e se
  aquela troca resolveu o problema.
- Registrar deslocamento (passagem, hospedagem, alimentação) por atendimento
  — hoje só populável via seed/banco, **ainda sem formulário na interface**
  (ver roadmap).
- Fechamento financeiro por OS: mão de obra (editável só por dono/gestor) +
  peças (somado automaticamente) + comissão calculada (editável).
- Filtro por status (em aba) e por período (dropdown, incluindo intervalo
  personalizado De/Até) e busca por cliente/nº/equipamento.
- Tempo relativo ("há 3 dias", "há 2h") ao lado do status em toda lista.

### Manutenção preventiva
- Equipamento pode ter frequência de manutenção (em meses); o sistema
  calcula sozinho a próxima data e sinaliza atraso.

### Financeiro / Painel
- Cards com ícone + tendência vs. mês passado: tickets abertos, faturamento
  do mês, ticket médio, despesas mensais (salário fixo de todos os técnicos
  + comissões do mês + deslocamento do mês).
- Gráfico de faturamento dos últimos 30 dias.
- Despesas por tipo no mês (salários, comissões, passagem aérea, hotel,
  alimentação) em barras horizontais.
- Agenda do dia por técnico.

### Equipe / Desempenho
- Métricas por técnico: taxa de acerto na 1ª visita, OS concluídas, média
  de tentativas, custo de deslocamento acumulado, comissão acumulada.
- Configuração de comissão por técnico (nenhuma / percentual / fixo).
- **Resumo mensal (contracheque)**: salário + comissão detalhada
  atendimento por atendimento, navegável por mês, com botão de impressão.

### Notificações ao cliente
- Disparo automático (fire-and-forget) a cada abertura de OS e mudança de
  status, via provider plugável (Console por padrão, Twilio disponível).
- Histórico de envios (sucesso/falha) visível na própria tela da OS.

### Portal do cliente
- Acompanhamento público do status, sem autenticação.

## 5. Requisitos não-funcionais

- Autenticação por JWT, papéis verificados em middleware por rota.
- Toda ação que envolve dinheiro (salário, comissão, fechamento financeiro
  de OS) é restrita a Dono/Gestor — técnico nunca escreve o próprio valor,
  só vê o resultado.
- Preço de peça e comissão são sempre **snapshot no momento do evento** —
  mudar o preço no catálogo ou a regra de comissão de um técnico não altera
  retroativamente atendimentos já fechados.
- Notificação ao cliente nunca bloqueia a resposta da API (fire-and-forget).

## 6. Fora de escopo (por enquanto)

- Nota fiscal / integração contábil.
- Multi-empresa (multi-tenant).
- App mobile nativo (hoje é web responsivo, mas pensado pra desktop).
- Pagamento online / split de pagamento.
- Diferenciação real de permissão entre Dono e Gestor (ver seção 2).

## 7. Onde ir a partir daqui

- **Arquitetura e como as peças se encaixam** → `docs/MODULACAO.md`
- **O que já foi construído e o que vem a seguir, em fases** →
  `docs/ROADMAP.md`
- **Comandos, convenções, armadilhas conhecidas** → `CLAUDE.md`
