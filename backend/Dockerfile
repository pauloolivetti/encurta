FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

# Instala só as dependências primeiro, para o Docker reaproveitar essa camada em builds futuros
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY src ./src

USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
