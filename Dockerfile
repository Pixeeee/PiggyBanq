FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.7.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY packages/stellar-core/package.json packages/stellar-core/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile --filter @piggybanq/server... --filter piggybanq
COPY server/src server/src
COPY server/tsconfig.json server/tsconfig.json
COPY server/prisma/schema.prisma server/prisma/schema.prisma
COPY config/supabase-ca.crt server/prisma/supabase-ca.crt
COPY packages/stellar-core packages/stellar-core
COPY packages/types packages/types
RUN DATABASE_URL=postgresql://build:build@localhost/build DIRECT_URL=postgresql://build:build@localhost/build \
    pnpm --filter @piggybanq/server exec prisma generate --schema prisma/schema.prisma \
    && pnpm --filter @piggybanq/server build
ENV NODE_ENV=production HOST=0.0.0.0
USER node
WORKDIR /app/server
EXPOSE 4000
CMD ["node", "--import", "tsx", "src/index.ts"]
