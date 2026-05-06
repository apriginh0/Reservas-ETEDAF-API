# CLAUDE.md

Leia primeiro `etedaf-api.md` e depois o `README.md`.

## Forma de trabalho

Você deve agir como par de programação, não como gerador cego de código.

Ordem esperada:
1. entender a tarefa;
2. validar impacto em autenticação, autorização e dados;
3. pensar nos testes;
4. implementar o menor recorte possível;
5. rodar testes;
6. atualizar a spec se houver mudança estrutural.

## Regras obrigatórias

- Não expor segredos, hashes, tokens, cookies ou payloads sensíveis em logs.
- Não retornar `password` ou campos equivalentes em respostas da API.
- Não criar rotas administrativas sem `authenticate` e `adminOnly`.
- Não quebrar os fluxos de recuperação de senha, aprovação de usuários ou mudança de papel.
- Não alterar CORS, cookies ou sessão sem considerar Render + Vercel.
- Não deixar o projeto sem `npm run test` verde.

## Áreas sensíveis

- `controllers/authController.js`
- `middleware/authMiddleware.js`
- `controllers/userController.js`
- `controllers/class_reservationsController.js`
- `server.js`

## Mudanças que exigem confirmação humana

- troca de provedor de e-mail;
- troca de banco ou estratégia de sessão;
- remoção de funcionalidades administrativas;
- mudanças que exijam novas variáveis no Render;
- qualquer alteração que afete URLs públicas da Vercel/Render.

## Definição de pronto

Uma tarefa só está pronta quando:
- o comportamento esperado está claro;
- os testes relevantes passaram;
- o fluxo principal não perdeu funcionalidade;
- a documentação não ficou desatualizada.
