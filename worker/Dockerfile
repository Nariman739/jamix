# Jamiwa worker — долгоживущий процесс с WhatsApp-сокетами (Baileys).
# Собирается из корня репозитория: docker build -f worker/Dockerfile .
# Нужен корень, потому что воркер компилирует ../src/generated/prisma.

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Корневые зависимости — только ради сгенерированного Prisma-клиента (он закоммичен в src/generated/prisma,
# но его рантайм @prisma/client нужен воркеру из его собственного node_modules).
COPY worker/package.json worker/package-lock.json ./worker/
# Форк Baileys с фиксом привязки (см. worker/vendor/README.md) — зависимость file:vendor/...
COPY worker/vendor ./worker/vendor
RUN cd worker && npm ci

COPY src/generated/prisma ./src/generated/prisma
# Сгенерированный клиент лежит в /app/src и ищет @prisma/client вверх по дереву — отдаём ему пакет воркера
# (версии @prisma/client в worker и в корне должны совпадать с версией prisma CLI, которой сгенерирован клиент).
RUN mkdir -p node_modules/@prisma && ln -s /app/worker/node_modules/@prisma/client node_modules/@prisma/client
COPY worker/tsconfig.json ./worker/
COPY worker/src ./worker/src
RUN cd worker && npm run build

FROM node:22-bookworm-slim
WORKDIR /app/worker
ENV NODE_ENV=production
COPY --from=build /app/worker/node_modules ./node_modules
COPY --from=build /app/worker/dist ./dist
COPY --from=build /app/worker/package.json ./package.json
# Тихий health для Fly: процесс без HTTP, проверяем по живости.
CMD ["node", "dist/worker/src/index.js"]
