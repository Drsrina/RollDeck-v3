# 🎲 RollDeck V3 — TTRPG Master & Player Deck

> Rolador de dados profissional de RPG de mesa, rápido, responsivo, mobile-first e **100% offline**, com simulação de física de dados 3D na tela, mapa de notas relacional com grafo wiki, gerador de loot com motor duplo (Procedural e IA) e sistema de autenticação local.

---

## 🔐 Acesso e Credenciais

Ao iniciar o aplicativo, a tela de login principal valida a entrada:

| Usuário | Senha | Nível de Permissão |
| :--- | :--- | :--- |
| **`admin`** | **`admin`** | Acesso Completo de Mestre / Administrador |

- **Manter Conectado**: Salva a sessão no armazenamento local para conveniência.
- **Botão Preencher**: Atalho de 1 clique para auto-completar as credenciais na tela de login.
- **Logout Seguro**: Disponível a qualquer momento na Barra Lateral Esquerda, no Topo Mobile e na aba de Configurações.

---

## ✨ Principais Funcionalidades

### 1. 🎲 Mesa de Rolagem & Dados 3D na Tela
- Dados padrão TTRPG (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`, `d100`).
- Dados customizados com lados personalizados e símbolos (ex: Moeda, Fate/Fudge, dados numéricos e textuais).
- **Dados 3D Animados**: Simulação física de dados caindo, quicando e girando em 3 dimensões diretamente na tela ao rolar (ativável/desativável nas Configurações).
- Modificadores globais, vantagens, desvantagens e histórico persistido no IndexedDB.

### 2. ⚡ Gerador de Loot com Motor Duplo
- **Motor Procedural (Sem IA)**: 100% offline, determinístico e instantâneo. Utiliza taxonomias ricas de fantasia medieval, cyberpunk, sci-fi espacial, terror gótico e pós-apocalíptico.
- **Motor com IA (Google Gemini)**: Gera narrativas poéticas e descrições profundas conectadas ao lore do cenário.
- Suporte a colunas dinâmicas: fórmulas de dados (`1d8`, `2d6+2`), moedas com taxas de câmbio, min/max numéricos, tags, raridades ponderadas e regras sem repetição.

### 3. 🗺️ Mapa Tático de Notas & Grafo Wiki
- Tela infinita de nós com suporte a pan, zoom e minimapa tático.
- Conexões relacionais automáticas estilo Obsidian via links bidirecionais `[[Nome da Nota]]`.
- Exportação de notas para Markdown (.zip) e tabelas interativas no canvas.

### 4. 🎨 8 Temas Neon Imersivos com Propagação Total
- Cyberpunk Neon, Neon Roxo & Rosa, Fantasia Dourada, Druida Esmeralda, Vampírico Carmesim, Sci-Fi Oceânico, Minimalista Escuro e Chamas do Dragão.
- As paletas de cores atingem toda a interface, incluindo a **Barra Lateral Esquerda Desktop**, a TopBar e a BottomNav.

### 5. 📱 PWA 100% Offline-First
- Funciona sem internet através de Service Workers e banco de dados local IndexedDB.
- Instalável no celular (iOS / Android) e Desktop como aplicativo nativo.

---

## 🐳 Executando com Docker & Docker Compose (Recomendado)

O projeto possui configuração pronta para containerização rápida com Docker multi-stage build.

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/) instalados.

### 1. Iniciar com Docker Compose (Comando Único)
```bash
docker compose up --build -d
```
Acesse o aplicativo em seu navegador em: **`http://localhost:3000`**

### 2. Parar a aplicação
```bash
docker compose down
```

### 3. Executar via Docker CLI tradicional
```bash
# Construir a imagem
docker build -t rolldeck:latest .

# Rodar o container
docker run -d -p 3000:3000 --name rolldeck-app rolldeck:latest
```

---

## 💻 Executando Localmente (Sem Docker)

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20 ou superior.
- [npm](https://www.npmjs.com/) ou [bun](https://bun.sh/).

### Instalação e Execução
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Compilar versão de produção
npm run build

# 4. Iniciar servidor de produção
npm start
```
O servidor estará ativo em: **`http://localhost:3000`**

---

## 🧪 Testes Automatizados

Para rodar a suíte completa de testes unitários com Vitest:
```bash
npm test
```
Ou em modo watch contínuo:
```bash
npx vitest
```

---

## ⚙️ Variáveis de Ambiente (`.env`)

Crie um arquivo `.env` na raiz do projeto (baseado em `.env.example`):

```ini
# Porta do servidor (padrão: 3000)
PORT=3000

# Opcional: Chave da API do Google Gemini para geração de loot com IA.
# Caso não informada, o RollDeck utiliza automaticamente o motor procedural sem IA.
GEMINI_API_KEY="sua_chave_aqui"
```

---

## 📁 Estrutura do Projeto

```
├── Dockerfile                  # Multi-stage Docker build para produção
├── docker-compose.yml          # Orquestração do container Docker
├── .dockerignore               # Arquivos ignorados no build Docker
├── server.ts                   # Servidor Express com API e proxies
├── index.html                  # Ponto de entrada HTML e tags PWA
├── package.json                # Dependências e scripts
├── src/
│   ├── App.tsx                 # Componente raiz com guard de autenticação
│   ├── main.tsx                # Bootstrap do React
│   ├── index.css               # Estilos globais e Tailwind v4
│   ├── types/                  # Tipagens TypeScript completas
│   ├── db/
│   │   └── indexedDB.ts        # Armazenamento persistente local (idb)
│   ├── store/
│   │   ├── useAppStore.ts      # Estado global da mesa e configurações
│   │   ├── useAuthStore.ts     # Autenticação (admin / admin) e sessão
│   │   ├── useLootStore.ts     # Estado dos geradores de loot
│   │   └── useMapStore.ts      # Estado do mapa tático e nós
│   ├── screens/
│   │   ├── LoginScreen.tsx     # Tela de login principal do app
│   │   ├── RollScreen.tsx      # Mesa principal de rolagem de dados
│   │   ├── PackagesScreen.tsx  # Pacotes de sistemas de RPG
│   │   ├── LootScreen.tsx      # Gerador de tesouros procedural e IA
│   │   ├── MapScreen.tsx       # Mapa mental/tático relacional
│   │   ├── HistoryScreen.tsx   # Logs de rolagens anteriores
│   │   └── SettingsScreen.tsx  # Temas, dados 3D, backup e segurança
│   ├── components/
│   │   ├── dice/               # Animações 3D de dados, bandeja, modais
│   │   ├── loot/               # Cartões e tabela de loot gerado
│   │   ├── map/                # Canvas do mapa, minimapa, radial menu
│   │   └── navigation/         # TopBar, BottomNav e DesktopSidebar
│   └── lib/
│       ├── ai/                 # Motores de geração (Procedural + Gemini)
│       ├── audio.ts            # Sintetizador de áudio Web Audio API
│       ├── haptics.ts          # Feedback tátil com vibração
│       ├── roll.ts             # Motor de cálculo e fórmulas de dados
│       └── theme.ts            # Gerenciador de paletas neon
```

---

## 🛡️ Licença
Distribuído sob licença MIT. Criado para mesas de RPG de todo o mundo!
