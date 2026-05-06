# ETEDAF API Spec

## Visão geral

O backend da ETEDAF é responsável por autenticação, autorização, gestão de usuários e reservas. Ele atende o frontend hospedado na Vercel e grava dados no Turso.

## Objetivo

Fornecer uma API segura e simples para:
- registrar professores;
- aprovar ou rejeitar cadastros;
- autenticar usuários;
- recuperar senha;
- reservar salas com regras mínimas de conflito;
- permitir gestão administrativa sem expor rotas críticas.

## Escopo atual

- login, logout, `me`, refresh de sessão;
- cadastro com aprovação posterior;
- recuperação e redefinição de senha por e-mail;
- listagem de professores aprovados e pendentes;
- aprovação, rejeição e troca de papel por admin;
- CRUD de reservas com autorização por dono/admin.

## Fora de escopo

- multi-tenant;
- auditoria completa;
- painel de métricas;
- permissões granulares além de `admin` e `teacher`;
- rate limiting avançado;
- observabilidade externa.

## Arquitetura

- `server.js`: bootstrap do Express, CORS, cookies, rotas e handlers globais
- `controllers/`: regras de cada domínio
- `middleware/`: autenticação e autorização
- `config/`: leitura central de ambiente e políticas de cookie/origem
- `utils/`: helpers puros e serialização segura
- `tests/`: testes unitários de funções críticas

## Modelo de autenticação

- `access_token` via cookie `httpOnly`
- `refresh_token` via cookie `httpOnly`
- fallback para `Authorization: Bearer` ainda aceito no middleware para compatibilidade
- refresh token persistido no banco em forma derivada, nunca em texto puro

## Requisitos funcionais

1. Usuário aprovado deve conseguir autenticar.
2. Usuário não aprovado não deve conseguir acessar áreas protegidas.
3. Apenas admin pode aprovar, rejeitar ou trocar papel.
4. Apenas dono da reserva ou admin pode editar/excluir.
5. Recuperação de senha deve continuar funcional.
6. Listagens públicas/semipúblicas não devem expor dados sensíveis.

## Requisitos não funcionais

- não vazar segredos em log;
- não versionar `.env`;
- manter testes de helpers críticos;
- manter compatibilidade com Render;
- permitir desenvolvimento local contra backend local.

## Variáveis de ambiente

- obrigatórias:
  - `FRONTEND_URL`
  - `JWT_SECRET`
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
  - `RESEND_API_KEY`
- recomendadas:
  - `NODE_ENV`
  - `JWT_EXPIRES_IN`
  - `JWT_RESET_SECRET`
  - `RESET_TOKEN_EXPIRES_IN`
- necessárias se o endpoint administrativo de teste de e-mail continuar ativo:
  - `EMAIL_USER`
  - `EMAIL_PASS`

## Estratégia de testes

- `node --test` para helpers puros e contratos de serialização
- validação manual local dos fluxos:
  - login/logout
  - refresh de sessão
  - recuperação de senha
  - aprovação de usuário
  - criação/edição/exclusão de reserva por dono e bloqueio de terceiro

## Estratégia de deploy

- repositório hospedado no GitHub;
- deploy automático no Render;
- pipeline do GitHub Actions deve rodar `npm run test` antes do merge/deploy.

## Riscos atuais

- segredos antigos ainda precisam ser rotacionados no futuro;
- falta cobertura automatizada mais profunda de controllers;
- políticas de origem e sessão dependem de coerência entre Render e Vercel.

## Próximo passo recomendado

Adicionar testes de integração dos controllers mais críticos e revisar o fluxo completo de recuperação de senha em ambiente local antes do próximo deploy.
