# RoutePlan — Sistema de Roteirização de Clientes

Sistema completo de simulação de roteirização inspirado no Roadnet/Omnitracs.
Permite cadastro de clientes e vendedores, criação de rotas otimizadas (TSP),
planejamento semanal com drag-and-drop e exportação de resultados.

---

## Stack tecnológica

| Camada     | Tecnologia                          |
|------------|-------------------------------------|
| Frontend   | Next.js 14 (App Router) + TypeScript |
| Estilo     | Tailwind CSS + shadcn/ui            |
| Mapa       | Leaflet.js (livre) ou Google Maps   |
| Backend    | Node.js + Express + TypeScript      |
| ORM        | Prisma                              |
| Banco      | PostgreSQL (ou SQLite em dev)       |
| Upload     | Multer + PapaParse                  |
| Export     | ExcelJS                             |

---

## Pré-requisitos

- Node.js >= 18
- PostgreSQL >= 14 (ou use SQLite para desenvolvimento rápido)
- npm ou pnpm

---

## Instalação rápida

### 1. Clone e instale dependências

```bash
git clone <repo>
cd routeplan

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure variáveis de ambiente

**backend/.env**
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/routeplan"
# Para SQLite (desenvolvimento sem PostgreSQL):
# DATABASE_URL="file:./dev.db"

PORT=3001
NODE_ENV=development

# Google Maps API (opcional — sem ela usa cálculo Haversine)
GOOGLE_MAPS_API_KEY=sua_chave_aqui
```

**frontend/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_GOOGLE_MAPS_KEY=sua_chave_aqui
```

### 3. Banco de dados

```bash
cd backend

# Cria as tabelas
npx prisma migrate dev --name init

# (Opcional) Popula com dados de exemplo
npm run seed
```

### 4. Rode o projeto

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# Rodando em http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm run dev
# Rodando em http://localhost:3000
```

---

## Estrutura do projeto

```
routeplan/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Lógica de cada endpoint
│   │   ├── models/           # Tipos TypeScript
│   │   ├── routes/           # Definição das rotas REST
│   │   ├── services/         # Lógica de negócio (TSP, geocoding)
│   │   ├── middleware/       # Auth, validação, upload
│   │   └── config/           # Configurações (db, env)
│   ├── prisma/
│   │   ├── schema.prisma     # Modelo do banco
│   │   └── seed.ts           # Dados de exemplo
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router (páginas)
│   │   ├── components/
│   │   │   ├── map/          # Componentes de mapa
│   │   │   ├── routes/       # Módulo de criação de rotas
│   │   │   ├── clients/      # Gestão de clientes
│   │   │   ├── vendors/      # Gestão de vendedores
│   │   │   ├── layout/       # Topbar, Sidebar, Shell
│   │   │   └── ui/           # Componentes genéricos
│   │   ├── hooks/            # React hooks customizados
│   │   ├── lib/              # Utilitários (api, tsp, export)
│   │   └── types/            # Tipos TypeScript compartilhados
│   └── package.json
│
└── README.md
```

---

## API REST — Endpoints principais

### Clientes
| Método | Rota                        | Descrição                    |
|--------|-----------------------------|------------------------------|
| GET    | /api/clientes               | Lista todos os clientes      |
| POST   | /api/clientes               | Cria cliente                 |
| PUT    | /api/clientes/:id           | Atualiza cliente             |
| DELETE | /api/clientes/:id           | Remove cliente               |
| POST   | /api/clientes/import        | Importa CSV/Excel            |
| POST   | /api/clientes/geocode       | Geocodifica por endereço     |

### Vendedores
| Método | Rota                        | Descrição                    |
|--------|-----------------------------|------------------------------|
| GET    | /api/vendedores             | Lista vendedores             |
| POST   | /api/vendedores             | Cria vendedor                |
| PUT    | /api/vendedores/:id         | Atualiza vendedor            |

### Rotas
| Método | Rota                        | Descrição                    |
|--------|-----------------------------|------------------------------|
| GET    | /api/rotas                  | Lista rotas salvas           |
| POST   | /api/rotas                  | Salva nova rota              |
| POST   | /api/rotas/otimizar         | Calcula rota otimizada (TSP) |
| GET    | /api/rotas/:id/export       | Exporta rota em Excel        |

### Planejamento
| Método | Rota                        | Descrição                    |
|--------|-----------------------------|------------------------------|
| GET    | /api/planejamento           | Busca planejamento semanal   |
| POST   | /api/planejamento           | Salva planejamento           |
| PUT    | /api/planejamento/:id       | Atualiza alocação de dia     |

---

## Funcionalidades implementadas

- [x] Cadastro manual de clientes e vendedores
- [x] Importação via CSV com preview e validação
- [x] Geocodificação automática (Haversine / Google Maps)
- [x] Mapa interativo com marcadores por vendedor
- [x] Otimização de rota via TSP Nearest Neighbor
- [x] Cálculo de KM e tempo estimado por rota
- [x] Rota sempre começa e termina na base do vendedor
- [x] Planejamento semanal (seg–sáb × semanas 1–4)
- [x] Drag-and-drop no calendário logístico
- [x] Regra de sábado (apenas clientes sem dia fixo)
- [x] Validação de duplicidade e clientes não cadastrados
- [x] Persistência completa em banco de dados
- [x] Exportação para Excel/CSV
- [x] Dashboard com KPIs e cobertura por vendedor

---

## Variáveis de ambiente — referência completa

```env
# Backend
DATABASE_URL=           # URL do PostgreSQL ou SQLite
PORT=3001               # Porta da API
NODE_ENV=development
GOOGLE_MAPS_API_KEY=    # Opcional — geocoding e directions reais

# Frontend
NEXT_PUBLIC_API_URL=    # URL da API backend
NEXT_PUBLIC_GOOGLE_MAPS_KEY=  # Para renderizar mapa Google (opcional)
```

---

## Contribuindo

1. Crie uma branch: `git checkout -b feature/nome`
2. Commit: `git commit -m "feat: descrição"`
3. Pull request com descrição do que foi alterado
