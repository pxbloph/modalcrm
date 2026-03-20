FROM node:18-alpine AS builder
WORKDIR /app

# Instala OpenSSL (necessário para o Prisma)
RUN apk add --no-cache openssl openssl-dev libc6-compat

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

# Instala OpenSSL também no estágio final
RUN apk add --no-cache openssl libc6-compat

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3012
CMD ["node", "dist/main.js"]
