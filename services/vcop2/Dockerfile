FROM node:24-alpine
ARG SOURCE_COMMIT=unknown
ENV NODE_ENV=production VCOP2_HOST=0.0.0.0 VCOP2_PORT=3000 VCOP2_RUNTIME_ASSETS=/runtime-assets SOURCE_COMMIT=$SOURCE_COMMIT DATABASE_PATH=/app/data/vcop2.sqlite PUBLIC_ORIGIN=https://soritok.com
LABEL org.opencontainers.image.revision=$SOURCE_COMMIT
WORKDIR /app
COPY server.mjs http.mjs memo.mjs rooms.mjs ./
COPY web ./web
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node","server.mjs"]
