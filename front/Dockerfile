# Etapa 1: instala dependências e gera o build de produção
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* é embutido no bundle do cliente em tempo de build, não de execução — por
# isso precisa ser um build arg (setado via `docker build --build-arg` ou docker-compose
# `build.args`), não só uma env var de runtime do container final.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Etapa 2: imagem final — só o output "standalone" (bem menor que copiar node_modules inteiro)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
