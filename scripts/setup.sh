#!/usr/bin/env bash
# ============================================================
# setup.sh — Local Development Setup
# ============================================================
# Installs dependencies, starts infrastructure, and seeds the
# database for first-time local development.
# Usage: chmod +x scripts/setup.sh && ./scripts/setup.sh
# ============================================================

set -e

echo "🚀 Vehicle Rental Marketplace — Local Setup"
echo "============================================="

# ─── Prerequisites Check ────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required"; exit 1; }
command -v docker-compose >/dev/null 2>&1 && DC="docker-compose" || DC="docker compose"

echo "✅ Prerequisites met"

# ─── Start Infrastructure ───────────────────────────────────
echo "📦 Starting MongoDB, Redis, RabbitMQ..."
cd backend
$DC up -d mongodb redis rabbitmq
cd ..
echo "✅ Infrastructure is up"

# ─── Install Backend Dependencies ───────────────────────────
echo "📦 Installing backend dependencies..."
SERVICES=(auth-service vehicle-service booking-service payment-service tracking-service notification-service chat-service ai-service admin-service)
for svc in "${SERVICES[@]}"; do
  echo "  ➜ $svc"
  cd "backend/services/$svc" && npm install && cd ../../..
done

echo "  ➜ gateway"
cd backend/gateway && npm install && cd ../..

# ─── Install Frontend Dependencies ──────────────────────────
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# ─── Install ML Dependencies ────────────────────────────────
echo "📦 Installing ML dependencies..."
cd ml && pip install -r requirements.txt && cd ..

# ─── Copy .env Files ────────────────────────────────────────
echo "📋 Copying .env.example → .env files..."
for svc in "${SERVICES[@]}"; do
  cp -n "backend/services/$svc/.env.example" "backend/services/$svc/.env" 2>/dev/null || true
done

# ─── Seed Database ──────────────────────────────────────────
echo "🌱 Seeding database..."
npx ts-node scripts/seed.ts

echo ""
echo "============================================="
echo "✅ Setup complete! Run services with:"
echo "   cd backend && docker-compose up"
echo "============================================="
