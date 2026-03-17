# ============================================================
# Dockerfile — Authentication & Authorization Service
# Multi-stage build with Prisma generation step.
# ============================================================

FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
COPY . .
RUN npm run build

# ─── Production image ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts and Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# Run migrations, then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
