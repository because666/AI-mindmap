FROM node:20-alpine AS builder

WORKDIR /app

COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY package*.json ./

RUN npm install

WORKDIR /app/client
RUN npm install
COPY client/ ./
RUN npm run build

WORKDIR /app/server
RUN npm install
COPY server/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
