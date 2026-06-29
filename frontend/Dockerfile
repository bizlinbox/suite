FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs nodejs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/env-replace.js ./env-replace.js
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

RUN chmod +x entrypoint.sh && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/login', (r) => { process.exit(r && r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

ENTRYPOINT ["./entrypoint.sh"]
