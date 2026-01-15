FROM node:20-alpine

WORKDIR /app

COPY gateway-worker/app/package*.json ./

RUN npm ci --only=production

COPY gateway-worker/app .

