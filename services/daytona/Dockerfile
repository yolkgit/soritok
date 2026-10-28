FROM node:24-bookworm-slim
ARG SOURCE_COMMIT=unknown
LABEL org.opencontainers.image.source="https://github.com/yolkgit/soritok" \
      org.opencontainers.image.revision="${SOURCE_COMMIT}"
WORKDIR /app
COPY package.json ./
COPY server/ server/
COPY scripts/build-static.mjs scripts/build-static.mjs
COPY drizzle/ drizzle/
COPY rom-web/ rom-web/
RUN mkdir -p /app/data /app/public && chown node:node /app/data /app/public
USER node
ENV NODE_ENV=production PORT=3000 ROM_WEB_ARTIFACTS=/runtime-assets SOURCE_COMMIT=${SOURCE_COMMIT}
EXPOSE 3000
CMD ["sh","-c","node scripts/build-static.mjs && node server/start.mjs"]
