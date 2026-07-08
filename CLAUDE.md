# Contexto do projeto — Gestor de Assistência Técnica

Antes de planejar uma feature nova ou uma mudança de arquitetura, leia
nessa ordem: **`PRD.md`** (visão e requisitos) → **`docs/MODULACAO.md`**
(como está estruturado) → **`docs/ROADMAP.md`** (o que já foi decidido pra
próximas etapas). Isso evita redecidir algo que já foi pensado, ou
reconstruir algo que foi removido de propósito.

## Stack
- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL
- Frontend: React + Vite + TypeScript + Tailwind + recharts + lucide-react

## Comandos
```bash
# Backend
cd backend
cp .env.example .env        # preencher DATABASE_URL e JWT_SECRET
npm install
npx prisma migrate dev      # aplica o schema
npm run seed                # popula dados de teste
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

Login do seed: `dono@empresa.com` / `123456` (dono), `joao@empresa.com`,
`marina@empresa.com`, `carlos@empresa.com` (técnicos, mesma senha).

## Armadilha conhecida: rodar o seed de novo
`npm run seed` sempre faz `create` (nunca `upsert`). Se o banco já tem os
usuários do seed anterior, rodar de novo falha na primeira constraint
única (e-mail duplicado) e a execução para no meio — sem erro óbvio de por
que os dados novos não apareceram. Depois de qualquer mudança no
`schema.prisma` ou no `seed.ts`, o comando certo é:
```bash
npx prisma migrate reset
```
Isso derruba o banco, reaplica as migrations e roda o seed automaticamente
— não `npm run seed` isolado.

## Convenções que o código já segue (manter)
- **Rotas específicas antes de `:id`** no Express (ex: `/manutencoes-preventivas`
  e `/resumo-mensal` precisam vir antes de `/:id` nos respectivos routers).
- **Valores financeiros são snapshot**, nunca recalculados a partir da
  config atual depois do fato (preço de peça, comissão, salário).
- **Notificação ao cliente é fire-and-forget** — nunca `await` dentro do
  fluxo principal da requisição.
- **Funcionário resolve a própria identidade pelo token** (`buscarFuncionarioPorUsuarioId`),
  nunca por um `:id` vindo do cliente.
- **Todo `include` novo no Prisma precisa de um campo espelho no tipo
  TypeScript do frontend** (`frontend/src/types/index.ts`) — senão o dado
  existe na API mas o frontend não sabe.
- Ações que envolvem dinheiro (salário, comissão, fechamento financeiro)
  são restritas a Dono/Gestor no backend — nunca só escondidas na UI.

## Validação
Não há banco de teste automatizado configurado ainda. Pra validar mudanças:
```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc -b --noEmit && npm run build
```
Rodar contra um Postgres real (via `npm run dev` + Prisma Studio ou a
própria interface) antes de considerar uma mudança de schema pronta —
verificação de tipos sozinha não pega tudo.
