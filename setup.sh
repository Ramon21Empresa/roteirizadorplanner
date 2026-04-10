#!/bin/bash
# setup.sh — Configura o projeto para desenvolvimento local
# Execute: bash setup.sh

set -e
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   RoutePlan — Setup de desenvolvimento   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Backend ────────────────────────────────────────────────
echo "▶ Instalando dependências do backend..."
cd backend
npm install

echo "▶ Configurando variáveis de ambiente do backend..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "   ✓ .env criado — edite com suas credenciais de banco"
else
  echo "   ✓ .env já existe"
fi

echo ""
echo "⚠  IMPORTANTE: edite backend/.env com a DATABASE_URL correta antes de continuar."
echo "   Para usar SQLite (sem PostgreSQL), troque o provider em prisma/schema.prisma"
echo "   e use: DATABASE_URL=\"file:./dev.db\""
echo ""
read -p "   Pressione Enter após configurar o .env..."

echo "▶ Executando migration do banco..."
npx prisma migrate dev --name init 2>/dev/null || npx prisma db push

echo "▶ Populando banco com dados de exemplo..."
npm run seed

# ── Frontend ───────────────────────────────────────────────
echo ""
echo "▶ Instalando dependências do frontend..."
cd ../frontend
npm install

echo "▶ Configurando variáveis de ambiente do frontend..."
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "   ✓ .env.local criado"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║            Setup concluído!              ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Para iniciar o projeto, abra dois terminais:"
echo ""
echo "  Terminal 1 (API):      cd backend  && npm run dev"
echo "  Terminal 2 (Frontend): cd frontend && npm run dev"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:3001"
echo "  Health:   http://localhost:3001/health"
echo ""
