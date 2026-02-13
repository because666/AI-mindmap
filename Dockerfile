FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm install

WORKDIR /app/client
COPY client/ ./
RUN npm run build

WORKDIR /app/server
COPY server/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY server/package*.json ./server/

WORKDIR /app/server
RUN npm install --production --ignore-scripts

WORKDIR /app

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV CLIENT_DIST_PATH=/app/client/dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server/dist/index.js"]
