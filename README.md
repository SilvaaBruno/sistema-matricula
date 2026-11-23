# Sistema de Matrícula — Teste Prático (CIn-UFPE)

Monorepo do teste prático da seleção de bolsista CInCoders (Edital nº 5/2026): sistema de matrícula de graduação com dois perfis (Secretaria e Aluno).

- `backend/`: API REST em Node + Express + TypeScript + SQLite (`better-sqlite3`), validação com zod, testes com Vitest + Supertest.
- `frontend/`: React + Vite + TypeScript, React Router, testes com Vitest + Testing Library.

## Como rodar do zero

Requisitos: Node 20+ e npm.

```bash
# 1) Back-end (http://localhost:3333)
cd backend
npm install
npm run seed     # cria matricula.db com os dados iniciais (recria o banco se já existir)
npm start        # `npm start` também popula o banco se ele ainda não existir

# 2) Front-end (http://localhost:5173) — em outro terminal
cd frontend
npm install
npm run dev      # o Vite encaminha /api para http://localhost:3333
```

Testes: `npm test` dentro de `backend/` e de `frontend/`. Verificação de tipos: `npm run typecheck`. Build do front: `npm run build`.

Variáveis opcionais: `PORT`, `DB_FILE` e `JWT_SECRET` (back-end); `VITE_API_URL` (front-end, para apontar para uma API em outro endereço).

## Dados iniciais (login só com nome de usuário)

| Usuário      | Perfil     | Curso                  | Observações |
|--------------|------------|------------------------|-------------|
| `secretaria` | Secretaria | —                      | |
| `ana`        | Aluno      | Sistemas de Informação | 180h de eletivas de perfil (excede 120h, o excedente vira livre); reprovada em IF673 |
| `bia`        | Aluno      | Sistemas de Informação | só aprovada em IF668 (não pode cursar IF700: falta IF669) |
| `carlos`     | Aluno      | Ciência da Computação  | reprovado em IF669 (não satisfaz o pré-requisito de IF703) |
| `dani`       | Aluno      | Ciência da Computação  | só aprovada em IF668 |

Os dois cursos compartilham disciplinas classificadas de forma diferente: IF702 é eletiva de perfil em SI e obrigatória em CC; IF673 é o inverso. IF673 tem apenas 2 vagas, para facilitar testar turma lotada.

## Requisito extra: pré-requisitos entre disciplinas

**Por que:** é uma regra comum em sistemas de matrícula e usa dados que o modelo já tem (o histórico de aprovações), então atravessa back-end e front-end sem mexer no restante do modelo.

**Regras que defini:**
1. Uma disciplina pode ter vários pré-requisitos; a secretaria os define ao cadastrar ou editar a disciplina (o `PUT` substitui a lista inteira).
2. O aluno só se matricula se tiver **aprovação** em todos os pré-requisitos. Reprovação e matrícula ativa **não** satisfazem.
3. Recusa com `409 PREREQUISITE_NOT_MET` e os códigos pendentes em `error.details.missing`.
4. Pré-requisitos valem para todos os cursos (não dependem do curso do aluno).
5. Uma disciplina não pode ser pré-requisito dela mesma, o pré-requisito precisa existir (`404`) e ciclos são recusados (`409 PREREQUISITE_CYCLE`).
6. As ofertas mostram os pré-requisitos e o que falta para o aluno; o botão de matrícula fica bloqueado.

## API

Erros seguem `{ "error": { "code", "message", "details?" } }`. Autenticação: `POST /auth/login` devolve um JWT (8h); enviar `Authorization: Bearer <token>`.

| Método | Rota                | Perfil     | Descrição |
|--------|---------------------|------------|-----------|
| POST   | `/auth/login`       | —          | `{ username }` → `{ token, user }` |
| GET    | `/disciplines`      | Secretaria | Lista com `?search&page&pageSize` (inclui `prerequisites`) |
| POST   | `/disciplines`      | Secretaria | `code`, `name`, `workload`, `prerequisiteIds?` |
| PUT    | `/disciplines/:id`  | Secretaria | Edita (substitui os pré-requisitos) |
| GET    | `/professors`       | Secretaria | Lista com busca e paginação |
| POST   | `/professors`       | Secretaria | `name`, `email` |
| GET    | `/classes`          | Secretaria | Turmas com `occupied` e `capacity` (paginado) |
| POST   | `/classes`          | Secretaria | `disciplineId`, `professorId`, `capacity` |
| PATCH  | `/classes/:id`      | Secretaria | Altera vagas (`capacity`) |
| GET    | `/offers`           | Aluno      | Ofertas com `availableSeats`, `kind` (MANDATORY/PROFILE/FREE), `prerequisites` e `missingPrerequisites` |
| GET    | `/enrollments`      | Aluno      | Minhas matrículas ativas |
| POST   | `/enrollments`      | Aluno      | `{ classId }` |
| DELETE | `/enrollments/:id`  | Aluno      | Cancela (a vaga volta para a turma) |
| GET    | `/progress`         | Aluno      | Por grupo: exigida, integralizada, em curso, falta e percentual |

Status: `400` validação, `401` sessão ausente/expirada, `403` perfil sem acesso, `404` não encontrado, `409` regra de negócio recusada (`CLASS_FULL`, `ALREADY_APPROVED`, `ALREADY_ENROLLED`, `CAPACITY_BELOW_ENROLLED`, `DISCIPLINE_CODE_TAKEN`, `PROFESSOR_EMAIL_TAKEN`, `PREREQUISITE_NOT_MET`, `PREREQUISITE_CYCLE`, `ENROLLMENT_NOT_ACTIVE`).

## Principais decisões

**Back-end**
- **SQLite**: zero instalação para quem roda o projeto; as transações síncronas do `better-sqlite3` simplificam a regra de vagas.
- **Regras em `src/services/`**, separadas das rotas (`src/app.ts`), que só validam a entrada (zod) e delegam.
- **Segurança**: as rotas do aluno usam sempre o id do token, nunca um id vindo do cliente (regra 9); matrícula de outro aluno responde `404`. Consultas parametrizadas; coringas do `LIKE` removidos da busca.
- **Matrícula em transação**: checa aprovação prévia, duplicidade, pré-requisitos e lotação.
- Vagas ocupadas = matrículas `ACTIVE`; cancelar só muda o status, então a vaga volta sozinha.
- **Progresso**: cada disciplina aprovada conta uma vez; o excedente de perfil soma em livres; percentual limitado a 100% e falta mínima 0.
- Login sem senha, como o enunciado permite.

**Front-end**
- Sem biblioteca de estado de servidor: o hook `useResource` cobre carregamento, erro com "Tentar de novo" e descarte de respostas atrasadas.
- **Busca e página ficam na URL** (`?search=…&page=…`), via `usePagedSearch`.
- Sessão no `localStorage`; qualquer `401` em chamada autenticada limpa a sessão e volta ao login com aviso. `RequireRole` impede um perfil de abrir a área do outro.
- Mensagens de recusa por regra de negócio vêm da própria API e aparecem na tela.
- Aluno: layout mobile-first (cartões, a partir de 360px). Secretaria: tabelas, pensada para desktop.
- Em desenvolvimento o Vite faz proxy de `/api`, evitando CORS e URL fixa no código.

**Processo**: cada funcionalidade nasceu em uma branch (`feat/…`, `chore/…`, `docs/…`) mergeada na `develop` com `--no-ff`; a `develop` foi mergeada na `main` ao final. Commits em português (Conventional Commits).

## O que ficou de fora e o que eu faria com mais tempo

- Professores só têm listagem e cadastro (o enunciado não pede edição).
- A listagem de turmas não tem busca; os seletores do formulário de turma e de pré-requisitos carregam até 100 disciplinas/professores (limite da API). Com mais dados, usaria um campo de busca assíncrona.
- Senha com hash e `refresh token`; `helmet` e limite de requisições.
- Migrações versionadas do banco (hoje o esquema é criado com `CREATE TABLE IF NOT EXISTS`).
- Testes de ponta a ponta (Playwright) e um pipeline de CI no GitLab com typecheck, testes e build.
- Concorrência: SQLite aceita uma escrita por vez, o que protege a regra de vagas, mas em produção eu migraria para PostgreSQL com bloqueio de linha.
- Lista de espera e choque de horário, como evoluções naturais do requisito extra.
- Revisão de acessibilidade (foco, leitores de tela) e testes em dispositivos reais.
