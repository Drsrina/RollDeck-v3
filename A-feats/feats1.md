# 🛡️ Plano Diretor de Evolução Arquitetural e Segurança — RollDeck V3
> **Destino**: Deploy em VPS Linux via Docker Compose  
> **Objetivo**: Elevação da postura de segurança, multi-inquilino (equipes/times), controle de acesso granular (RBAC), banco de dados relacional conteinerizado e API aberta para Agentes de IA Externos.

---

## 📋 Sumário Executivo

O **RollDeck V3** nasceu como uma aplicação voltada para uso offline-first (IndexedDB local) com autenticação simplificada em memória.  
Para transformá-lo em uma plataforma **multi-usuário pronta para nuvem/VPS**, a arquitetura evoluirá para:
1. **Infraestrutura Conteinerizada (Docker Compose)**: Aplicação Web + Banco SQL (PostgreSQL) com persistência em volumes e rede interna isolada.
2. **Segurança & Autenticação de Nível de Produção**: Fim de credenciais embutidas; introdução de hashing seguro (Argon2id/bcrypt), JWT (HttpOnly Cookies), proteção contra ataques web (CSRF, XSS, Brute-Force Rate Limiting).
3. **Gestão de Usuários & RBAC Granular**: Painel administrativo para criação, bloqueio, e controle do que cada usuário pode acessar no app (ex: rolagens, gerador de loot, notas, IA).
4. **Equipes / Grupos de Jogo (Workspaces)**: Particionamento das notas e mapas em equipes/mesas, permitindo colaboração centralizada com controle de leitura/escrita.
5. **API Gateway para Agentes de IA**: Endpoints REST autenticados via **API Keys de Serviço** permitindo que agentes autônomos externos criem, consultem, atualizem notas e consultem dados táticos da campanha com permissões com escopo restrito.

---

## 🏗️ 1. Nova Topologia de Infraestrutura (Docker & VPS)

A aplicação passará a rodar em uma stack conteinerizada de dois serviços principais integrados por rede privada do Docker:

```
                      ┌──────────────────────────────────────────────┐
                      │              VPS Linux (Host)                │
                      │                                              │
                      │   [Nginx / Caddy com SSL Automático Let's]   │
                      │                      │                       │
                      └──────────────────────┼───────────────────────┘
                                             │ :3000
                       docker-compose        ▼
    ┌────────────────────────────────────────────────────────────────────────┐
    │  Rede Bridge: rolldeck-net                                             │
    │                                                                        │
    │   ┌───────────────────────────┐      ┌──────────────────────────────┐  │
    │   │   Serviço: rolldeck-app   │◄────►│    Serviço: rolldeck-db      │  │
    │   │   (Node.js / Express)     │      │    (PostgreSQL 16 Alpine)    │  │
    │   │                           │      │                              │  │
    │   │  - Frontend React Servido │      │  - Volume: pgdata_vol        │  │
    │   │  - Auth & RBAC Server     │      │  - Isolado (Sem porta host)  │  │
    │   │  - REST API / AI Endpoints│      │                              │  │
    │   └───────────────────────────┘      └──────────────────────────────┘  │
    └────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Atualização do `docker-compose.yml`
* Adição de contêiner **PostgreSQL 16 Alpine** com *healthcheck* nativo (`pg_isready`).
* Volume nomeado persistente para armazenamento dos dados (`pgdata_vol`).
* A porta do PostgreSQL **não será exposta para o host/internet**, apenas para a rede interna da aplicação.
* Apenas o contêiner `rolldeck-app` responde na porta configurável (`3000`).

---

## 🗄️ 2. Migração de Banco de Dados: IndexedDB ➔ PostgreSQL

Para garantir sincronização multi-usuário e acesso por Agentes de IA, os dados compartilhados (Usuários, Permissões, Equipes, Notas do Grafo) migram para o banco relacional.

### 2.1 Modelo de Dados Relacional (Schema SQL)

```sql
-- 1. Tabela de Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'player', -- 'admin', 'master', 'player'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Permissões Granulares por Módulo
CREATE TABLE user_permissions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    can_roll_dice BOOLEAN NOT NULL DEFAULT TRUE,
    can_use_loot BOOLEAN NOT NULL DEFAULT TRUE,
    can_use_ai_loot BOOLEAN NOT NULL DEFAULT FALSE,
    can_manage_notes BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_packages BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Equipes / Mesas de Jogo (Workspaces)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Associação Usuário-Equipe (com nível de acesso)
CREATE TABLE team_members (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'owner', 'editor', 'viewer'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

-- 5. Notas Compartilhadas e Grafo de Conexões
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    color VARCHAR(20),
    x_pos REAL DEFAULT 0,
    y_pos REAL DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Chaves de API para Agentes Externos de IA
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL, -- SHA-256 do token
    key_prefix VARCHAR(10) NOT NULL, -- ex: "rdk_live_"
    scopes TEXT[] NOT NULL DEFAULT '{"notes:read", "notes:write"}',
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

> **Estratégia Híbrida / Offline-First**: O cliente React continuará usando IndexedDB para cache offline de notas e rolagens locais, sincronizando com o PostgreSQL do servidor via fila de sincronização quando online.

---

## 🔒 3. Melhorias Críticas de Segurança

### 3.1 Substituição da Autenticação Hardcoded
* **Remoção imediata** de credenciais fixas (`admin / admin`).
* Implementação de fluxo de login real no backend Express:
  1. Hashes de senhas armazenados com **Argon2id** ou **bcrypt** (fator de custo 12).
  2. Inicialização segura: Criação automática do primeiro usuário `admin` caso a tabela esteja vazia, utilizando variável de ambiente inicial (`ADMIN_INIT_PASSWORD`).
  3. Sessão via **JWT (JSON Web Token)** assinado com chave secreta forte (`JWT_SECRET`), transportado em **Cookies `HttpOnly`, `SameSite=Strict`, `Secure`** para imunidade contra roubo de tokens via XSS.

### 3.2 Camada de Defesa da Aplicação (Express Middleware)
* **Helmet**: Configuração de headers de segurança HTTP (CSP, X-Content-Type-Options, Frameguard anti-clickjacking).
* **Express-Rate-Limit**: 
  * Rota `/api/auth/login`: Máximo de 5 tentativas por minuto por IP para barrar força bruta.
  * Rotas gerais: Limite por minuto com bloqueio temporário.
* **CORS Estrito**: Habilitado somente para a origem oficial configurada em produção.
* **Validação de Payload (Zod)**: Todos os corpos de requisição e query params validados rigidamente antes do processamento no banco.

---

## 👥 4. Módulo de Gerenciamento de Usuários e Equipes

### 4.1 Painel do Administrador (Frontend)
Na aba **Configurações / Painel Admin**, administradores terão acesso a:
* **Tabela de Usuários**: Listagem completa com busca, data de criação e status.
* **Editor de Permissões Granulares**:
  * Alternar permissão de Rolagem de Dados.
  * Alternar acesso ao Gerador de Loot (e sub-permissão de consumo de IA Gemini).
  * Alternar acesso à criação/edição de Notas e Grafo.
  * Alternar acesso ao Pacote de Dados customizados.
* **Ações Rápidas**: Redefinir senha de usuário, desativar/banir conta, promover a Mestre/Admin.

### 4.2 Equipes & Workspaces de Notas
* Um usuário pode criar ou ser convidado para uma **Equipe/Mesa**.
* Ao selecionar a equipe ativa na TopBar, o **Mapa Tático / Grafo Wiki** carrega automaticamente o conjunto de notas daquela equipe.
* Permissões internas de equipe:
  * **Dono/Mestre**: Gerencia membros e chaves de API da equipe.
  * **Editor (Jogador)**: Cria e edita nós e notas.
  * **Visualizador**: Apenas consulta o mapa e lê notas abertas.

---

## 🤖 5. API para Agentes Externos de IA

Para permitir que agentes autônomos (Claude, ChatGPT, LangChain, n8n, CrewAI, AutoGen ou agentes locais) interajam com o mundo do jogo:

### 5.1 Sistema de Chaves de API (`API Keys`)
* As chaves de serviço utilizam formato identificável: `rdk_live_<token_aleatorio_32_bytes>`.
* Apenas o hash SHA-256 é salvo no banco de dados.
* A chave é associada diretamente a uma **Equipe (Team)** específica e tem escopos (*scopes*) definidos:
  * `notes:read`: Leitura de notas e busca semântica.
  * `notes:write`: Criação e edição de notas.
  * `notes:delete`: Exclusão de notas.
  * `map:read`: Posição dos nós no canvas.

### 5.2 Endpoints Dedicados para IA (`/api/v1/agent/*`)

| Método | Endpoint | Escopo | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/agent/notes` | `notes:read` | Lista todas as notas da equipe com suporte a filtros e busca por tags. |
| `GET` | `/api/v1/agent/notes/:id` | `notes:read` | Retorna conteúdo completo de uma nota com seus links bidirecionais (`[[...]]`). |
| `POST` | `/api/v1/agent/notes` | `notes:write` | Agente cria uma nova nota (ex: resumo da sessão gerado pela IA, ficha de NPC, pista encontrada). |
| `PUT` | `/api/v1/agent/notes/:id` | `notes:write` | Atualiza conteúdo de uma nota existente. |
| `POST` | `/api/v1/agent/search` | `notes:read` | Busca por termos no grafo de notas para consulta de contexto rápida. |
| `GET` | `/api/v1/agent/graph` | `notes:read` | Retorna estrutura completa de nós e arestas do grafo wiki para raciocínio contextual. |

### 5.3 Exemplo de Requisição do Agente:
```bash
curl -X POST https://seu-dominio.com/api/v1/agent/notes \
  -H "Authorization: Bearer rdk_live_98a7sd8f7a6s5df876" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Pista: Símbolo do Culto Carmesim",
    "content": "Os aventureiros encontraram um amuleto gravado com o símbolo visto em [[Torre Abandonada]].",
    "tags": ["pista", "culto", "sessao-4"],
    "color": "#ef4444"
  }'
```

---

## 🚀 6. Roteiro de Execução em Fases

```mermaid
flowchart TD
    A[Fase 1: Infraestrutura & Docker] --> B[Fase 2: Banco PostgreSQL & Migrations]
    B --> C[Fase 3: Autenticação Segura JWT/Bcrypt]
    C --> D[Fase 4: Gestão de Usuários & RBAC]
    D --> E[Fase 5: Equipes & Compartilhamento de Notas]
    E --> F[Fase 6: API Gateway para Agentes de IA]
```

* **Fase 1**: Configurar PostgreSQL no `docker-compose.yml`, configurar ORM/Query Builder leve (ex: Prisma, Kysely ou Drizzle) e healthchecks.
* **Fase 2**: Criar migrações do banco com tabelas de usuários, permissões, equipes, notas e chaves de API.
* **Fase 3**: Backend de autenticação (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`), cookies seguros e middlewares de proteção.
* **Fase 4**: Tela administrativa para gestão de usuários e permissões granulares no frontend.
* **Fase 5**: Lógica de equipes/workspaces e sincronização das notas do canvas com o backend.
* **Fase 6**: Endpoints REST `/api/v1/agent/*` com autenticação por token e documentação OpenAPI/Swagger para agentes.

