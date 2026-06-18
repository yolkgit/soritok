# Stage 1: Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package*.json ./
# postinstall(prisma generate)이 스키마를 찾도록 먼저 복사
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run Application
FROM node:20-slim
WORKDIR /app

# Install necessary libraries for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl-dev

# Copy dependency files
COPY package*.json ./
# postinstall(prisma generate)이 스키마를 찾도록 먼저 복사
COPY prisma ./prisma
# Install all dependencies
RUN npm install

# Copy relevant files from build stage
COPY --from=frontend-build /app/dist ./dist
COPY --from=frontend-build /app/prisma ./prisma
COPY --from=frontend-build /app/*.ts ./
COPY --from=frontend-build /app/tsconfig*.json ./

# Copy folders for backend context
COPY --from=frontend-build /app/context ./context
COPY --from=frontend-build /app/pages ./pages
COPY --from=frontend-build /app/components ./components
COPY --from=frontend-build /app/services ./services
COPY --from=frontend-build /app/types.ts ./
COPY --from=frontend-build /app/constants.ts ./
COPY --from=frontend-build /app/authMiddleware.ts ./

# Generate Prisma Client (inside the target OS)
RUN npx prisma generate

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push && npx tsx server.ts"]
