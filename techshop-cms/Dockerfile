FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY public ./public

ENV NODE_ENV=production
ENV CMS_PORT=3002
ENV CMS_DATA_DIR=/data

EXPOSE 3002

CMD ["npm", "start"]
