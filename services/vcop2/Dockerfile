FROM node:24-alpine
ARG SOURCE_COMMIT=unknown
ENV NODE_ENV=production VCOP2_HOST=0.0.0.0 VCOP2_PORT=3000 VCOP2_RUNTIME_ASSETS=/runtime-assets SOURCE_COMMIT=$SOURCE_COMMIT
LABEL org.opencontainers.image.revision=$SOURCE_COMMIT
WORKDIR /app
COPY server.mjs ./
COPY web ./web
USER node
EXPOSE 3000
CMD ["node","server.mjs"]
