FROM node:20-alpine

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src

RUN mkdir -p uploads && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["dumb-init", "node", "src/index.js"]
