# 🎲 RollDeck V3 — TTRPG Master & Player Deck
> **Plataforma Profissional para Mestres e Jogadores de RPG de Mesa**  
> Rolador de dados com física 3D, mapa mental tático relacional (wiki bidirecional estilo Obsidian), gerador de loot duplo (Procedural Offline + IA Gemini), banco relacional PostgreSQL, controle de acesso granular (RBAC), suporte a equipes e **Gateway REST para Agentes Autônomos de IA**.

---

## 🔐 Acesso e Credenciais

Ao iniciar pela primeira vez via Docker ou localmente, o banco inicializa com o usuário Administrador seguro:

| Usuário | Senha Padrão | Nível | Painel Disponível |
| :--- | :--- | :--- | :--- |
| **`admin`** | **`admin123`** *(configurável no `.env`)* | **Administrador Global** | Governança RBAC, Gestão de Usuários, Equipes e Chaves de Agentes IA |

- **Sessão Segura**: Armazenamento criptográfico seguro via cookie `HttpOnly` com token JWT assinado.
- **Proteção Anti-Brute-Force**: Limite de tentativas de login por IP gerenciado via middleware Express.
- **Painel Administrativo**: Acessível na aba **Ajustes & Dados** para controle de privilégios de cada jogador.

---

## ✨ Principais Funcionalidades

### 1. 🎲 Mesa de Rolagem & Simulação 3D na Tela
- Dados padrão TTRPG (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`, `d100`) e dados customizados ilimitados (Fate/Fudge, Moedas, textos personalizados).
- **Sem Viés Estatístico**: Números gerados via Web Crypto API com técnica de amostragem por rejeição (*rejection sampling*).
- **Física de Dados 3D**: Renderização e colisões de dados saltando na tela (ativável/desativável nas preferências).
- Modificadores globais, vantagens/desvantagens e histórico persistido no PostgreSQL e cache local.

### 2. ⚡ Gerador de Loot com Motor Duplo
- **Motor Procedural (100% Offline)**: Instantâneo e determinístico. Gera nomes evocativos, materiais, raridades balanceadas e descrições para 8 gêneros (*Fantasia Medieval, Cyberpunk Noir, Sci-Fi, Faroeste Sobrenatural, Pós-Apocalipse, Terror Gótico, Steampunk e Mitologia*).
- **Motor com IA (Google Gemini)**: Gera crônicas poéticas e itens lendários com descrições ricas e detalhadas. Possui fallback automático entre modelos em caso de sobrecarga.
- **Colunas Dinâmicas**: Suporta fórmulas de dados integradas (`1d8`, `2d6+2`), moedas com taxas de câmbio automáticas, peso cumulativo e tags de propriedades.

### 3. 🗺️ Mapa Tático de Notas & Grafo Wiki
- Tela infinita para planejamento de campanhas, mapas mentais e sessões com suporte a pan, zoom e minimapa tático.
- **Conexões Bidirecionais Obsidian**: Reconhecimento automático de links relacionais no formato `[[Nome da Nota]]`.
- Exportação de notas para Markdown (.zip), JSON e sincronização com banco relacional.

### 4. 👥 Equipes, Mesas de Jogo & RBAC Granular
- Criação de **Múltiplas Equipes/Mesas**: Cada campanha possui seu próprio banco de notas isolado ou compartilhado.
- **Controle de Acesso por Módulo**: O administrador define por usuário quem pode:
  - Rolar dados
  - Usar o gerador de loot
  - Consumir créditos da IA Gemini
  - Criar e gerenciar notas
  - Modificar pacotes de dados

### 5. 🤖 Gateway de API para Agentes de IA Externos
Permita que agentes autônomos (Claude, ChatGPT, LangChain, n8n, CrewAI, AutoGen ou scripts locais) interajam diretamente com a campanha:
- **Chaves de API com Escopos**: Geração de chaves `rdk_live_...` vinculadas a uma mesa específica com escopos granulares (`notes:read`, `notes:write`).
- **Endpoints REST Dedicados**:
  - `GET /api/v1/agent/notes` — Consulta e busca por texto/tags em todas as notas da equipe.
  - `GET /api/v1/agent/notes/:id` — Retorna conteúdo e detalhes de uma nota.
  - `POST /api/v1/agent/notes` — Agente cria notas (resumos de sessão gerados por IA, fichas de NPCs, pistas encontradas).
  - `PUT /api/v1/agent/notes/:id` — Agente atualiza informações de notas existentes.

---

## 🐳 Executando com Docker Compose (Recomendado para Produção / VPS)

O projeto está pronto para deploy em qualquer VPS Linux (Ubuntu, Debian, etc.) ou ambiente local com Docker:

### 1. Iniciar a Stack Completa (App + PostgreSQL)
```bash
# Copie o template de ambiente
cp .env.example .env

# Construa e suba os contêineres em segundo plano
docker compose up --build -d
```
Acesse a aplicação em seu navegador em: **`http://localhost:3000`**

### 2. Verificar o Status dos Serviços
```bash
docker compose ps
```
Você verá ambos os contêineres saudáveis:
- `rolldeck-app` (porta `3000`)
- `rolldeck-postgres` (porta `5432` isolada na rede interna)

### 3. Parar a Aplicação
```bash
docker compose down
```

---

## ⚙️ Variáveis de Ambiente (`.env`)

Configure o arquivo `.env` para adequar o ambiente da sua VPS:

```ini
# Porta HTTP exposta
PORT=3000

# Chave secreta forte para assinatura dos tokens JWT
JWT_SECRET=sua_chave_secreta_jwt_de_producao

# Senha inicial do usuário 'admin' no primeiro boot do banco
ADMIN_INIT_PASSWORD=admin123

# Configurações do PostgreSQL
DB_USER=rolldeck
DB_PASSWORD=rolldeck_secure_pass_2026
DB_NAME=rolldeck_db

# (Opcional) Chave da API do Google Gemini para geração de loot com IA
GEMINI_API_KEY=
```

---

## 🧪 Testes e Qualidade de Código

A aplicação conta com suíte automatizada de testes cobrindo rolagens, stores de autenticação, motores de loot procedural e conexões de wiki links:

```bash
# Executar todos os testes com Vitest
docker compose run --rm rolldeck npx vitest run
```
Todos os **27 testes unitários** estão validados e verdes.
