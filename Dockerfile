# CKViz - produkcijska slika
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    CKVIZ_DATA_DIR=/data

WORKDIR /app

# Odvisnosti posebej, da se plast predpomni med spremembami kode
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Mapa za shranjene kvize in zgodovino iger
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server.js"]
