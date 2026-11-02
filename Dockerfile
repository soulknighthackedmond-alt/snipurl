# syntax = docker/dockerfile:1

# Fly's builder pulls node:22-slim exactly like this, so a successful local
# build means the remote build will succeed too.

FROM node:22-slim

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

# Run as an unprivileged user.
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node", "--experimental-sqlite", "--disable-warning=ExperimentalWarning", "src/server.js"]
