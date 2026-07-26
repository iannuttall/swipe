FROM node:24-bookworm-slim AS build

WORKDIR /app
ARG BASE_URL=https://newsletter.example.com
ENV BASE_URL=$BASE_URL

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/newsletter/package.json ./apps/newsletter/package.json
COPY apps/newsletter/turbo.json apps/newsletter/tsconfig.base.json apps/newsletter/biome.json ./apps/newsletter/
COPY apps/newsletter/packages ./apps/newsletter/packages
COPY apps/newsletter/migrations ./apps/newsletter/migrations
COPY apps/newsletter/emails ./apps/newsletter/emails
COPY apps/newsletter/scripts ./apps/newsletter/scripts

RUN printf '%s\n' \
  'packages:' \
  '  - apps/newsletter' \
  '  - apps/newsletter/packages/*' \
  '' \
  'allowBuilds:' \
  '  "@tailwindcss/oxide": true' \
  '  esbuild: true' \
  '  sharp: true' \
  '  workerd: true' \
  '' \
  'minimumReleaseAgeExclude:' \
  '  - "@hono/node-server@2.0.11"' \
  '  - esbuild@0.28.1' \
  '  - fast-uri@3.1.4' \
  '  - sharp@0.35.0' \
  '  - fast-xml-parser@5.10.1' \
  '  - next@16.2.11' \
  '  - postcss@8.5.18' \
  '' \
  'overrides:' \
  '  "@hono/node-server": 2.0.11' \
  '  esbuild: 0.28.1' \
  '  next: 16.2.11' \
  '  postcss: 8.5.18' \
  '  sharp: 0.35.0' \
  > pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile --filter email --filter '@email/*'
RUN pnpm --filter email build
RUN pnpm --filter @email/cli deploy --legacy --prod /app/runtime
RUN pnpm --filter @email/web deploy --legacy --prod /app/web-runtime

FROM node:24-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/runtime ./
COPY --from=build /app/web-runtime ./web
COPY --from=build /app/apps/newsletter/migrations ./migrations
COPY --from=build /app/apps/newsletter/scripts ./scripts

EXPOSE 3000
CMD ["node", "dist/index.js", "api", "serve"]
