# MemoryPlay 🎮

Jogo da memória desenvolvido com **React + Vite**, com interface inspirada em uma nebulosa vermelha. O projeto usa componentes React e CSS próprio.

## Requisitos

- Node.js 18 ou superior
- npm

## Executar localmente

1. Baixe o repositório em **Code → Download ZIP** e extraia, ou clone:

   ```bash
   git clone https://github.com/JoaoGabriel369/memoryplay.git
   cd memoryplay
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

4. Abra no navegador o endereço exibido pelo Vite (normalmente http://localhost:5173).

O servidor atualiza a página automaticamente quando você altera os arquivos.

## Outros comandos

- `npm run build` — gera a versão de produção na pasta `dist`.
- `npm run preview` — testa localmente a versão compilada.

## Publicar no Cloudflare Pages

Configure o projeto conectado ao GitHub com:

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`

## Como jogar

- **Fácil:** 8 pares (16 cartas).
- **Médio:** 12 pares (24 cartas).
- **Difícil:** 18 pares (36 cartas).
- Encontre todos os pares e tente bater seu recorde.
- O recorde de cada nível é salvo no armazenamento local do navegador.


## Publicar no Cloudflare Pages

O projeto usa Vite. Configure o Cloudflare Pages com:

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`

O arquivo `wrangler.toml` também declara `dist` como diretório de publicação. Não configure a pasta raiz do repositório como diretório de saída.

Para testar localmente:

```bash
npm install
npm run dev
```

Para validar a versão de produção:

```bash
npm run build
npm run preview
```
