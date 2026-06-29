FROM node:20-slim

RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs nodejs

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src

RUN mkdir -p uploads && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["dumb-init", "node", "src/index.js"]
