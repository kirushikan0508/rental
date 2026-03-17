# ============================================================
# Dockerfile — API Gateway
# Multi-stage build for production deployment.
# ============================================================

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Production image ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create logs directory
RUN mkdir -p logs

EXPOSE 3000

CMD ["node", "dist/index.js"]
