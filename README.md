# MemoryPlay

Jogo da memória em React + Vite, com API Express e autenticação hospedada no Supabase.

## Desenvolvimento local

Requisitos: Node.js 20+ e npm.

```bash
git clone https://github.com/JoaoGabriel369/memoryplay.git
cd memoryplay
npm install
cp .env.example .env
# Preencha SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no .env
npm run dev
```

Abra http://localhost:5173. O Vite encaminha `/api` para o Express na porta 3001. O login local já usa o mesmo projeto Supabase de produção; não existe mais banco SQLite local para autenticação.

## Arquitetura hospedada

- **GitHub:** repositório central `JoaoGabriel369/memoryplay`, branch `main`.
- **Cloudflare Pages:** frontend React/Vite, build `npm run build`, diretório `dist`. A Function `functions/api/[[path]].js` encaminha chamadas same-origin `/api/*` ao Railway.
- **Railway:** API Express, comando `npm start`, healthcheck `/api/health`.
- **Supabase:** Supabase Auth armazena contas e autentica senhas; PostgreSQL é o banco gerenciado do projeto.

### Variáveis do Railway

Configure no serviço da API:

- `NODE_ENV=production`
- `SUPABASE_URL=https://aaqaxwbvyaptwkzfhcjk.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`

O Railway fornece `PORT` automaticamente. A chave publishable não é uma chave administrativa; nunca coloque uma secret/service-role key no frontend.

### Variáveis do Cloudflare Pages

Em Settings > Environment variables, configure para Production e Preview:

- `API_ORIGIN=https://<dominio-publico-do-servico-railway>`

O valor não deve terminar com barra. O Pages Function encaminha cookies HttpOnly entre o navegador e a API.

### Supabase Auth

No Dashboard do projeto, em Authentication > URL Configuration:
- Site URL: `https://memoryplay.pages.dev`
- Redirect URLs: `https://memoryplay.pages.dev/**` e `http://localhost:5173/**`

Se a confirmação de e-mail estiver ativada, novos usuários precisam confirmar o endereço antes do primeiro login.

## Segurança

- Senhas são processadas e armazenadas pelo Supabase Auth, não pelo MemoryPlay.
- Sessões são entregues em cookies HttpOnly, Secure em produção e SameSite=Lax.
- A API usa Helmet e limitação de tentativas de login/cadastro.
- Nenhuma chave administrativa do Supabase é usada ou exposta.
- `GET /api/health` verifica o backend e a disponibilidade do endpoint de autenticação Supabase.

## Comandos

- `npm run dev` — frontend e API local.
- `npm start` — API para produção.
- `npm run build` — build do frontend.
- `npm run preview` — prévia do build.

### Sobre contas antigas do SQLite

O banco SQLite ficava no computador onde o jogo foi executado e não está no repositório. Não é possível migrar essas senhas automaticamente sem o arquivo local. Os usuários antigos devem criar/confirmar uma conta no Supabase; não copie arquivos SQLite nem hashes de senha para o GitHub.
