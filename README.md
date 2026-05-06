# Reservas ETEDAF API

API em Node.js/Express para autenticação, gestão de usuários e reservas de salas/laboratórios da ETEDAF, com persistência no Turso.

## Objetivo

Este backend centraliza:
- autenticação com JWT e cookies `httpOnly`;
- aprovação e gestão de usuários;
- recuperação de senha por e-mail;
- criação, edição e exclusão de reservas com regras de autorização.

## Stack

- Node.js + Express
- Turso (`@libsql/client`)
- JWT + cookies `httpOnly`
- Resend para recuperação de senha
- testes nativos do Node (`node --test`)

## Setup local

1. Copie `.env.example` para `.env`.
2. Preencha as variáveis de ambiente.
3. Instale as dependências com `npm install`.
4. Rode `npm run dev`.

## Variáveis de ambiente

- `PORT`
- `NODE_ENV`
- `FRONTEND_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_RESET_SECRET`
- `RESET_TOKEN_EXPIRES_IN`
- `ANDROID_MINIMUM_SUPPORTED_VERSION`
- `ANDROID_LATEST_VERSION`
- `ANDROID_STORE_URL`
- `ANDROID_UPDATE_MESSAGE`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `TURSO_ID`
- `RESEND_API_KEY`
- `EMAIL_USER`
- `EMAIL_PASS`

## Scripts

- `npm run dev`: sobe o backend com nodemon
- `npm run start`: sobe o backend em modo simples
- `npm run test`: roda os testes unitários
- `npm run test:ci`: comando usado no CI

## Segurança operacional

- O arquivo `.env` não deve ser versionado.
- O deploy em produção depende das variáveis configuradas no Render.
- Alterações em autenticação, cookies, CORS e e-mail devem ser validadas localmente antes de subir.

## Política de atualização do app

- `GET /api/app/bootstrap?platform=android&version=2.2` retorna a política atual do aplicativo Android.
- `ANDROID_MINIMUM_SUPPORTED_VERSION` define a menor versão que ainda pode continuar usando a API.
- `ANDROID_LATEST_VERSION` informa a versão mais recente disponível na loja.
- Quando o app nativo estiver abaixo da versão mínima, ele mostra uma mensagem obrigatória de atualização antes do uso normal.

## Documentação do projeto

- `CLAUDE.md`: fluxo operacional para IA e trabalho assistido
- `etedaf-api.md`: spec viva do backend
