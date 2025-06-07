# Stage 1: Build
FROM node:22.16-slim AS builder
WORKDIR /app
COPY package*.json ./
# Install all dependencies (including devDependencies) for build
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22.16-slim
WORKDIR /app
# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production
# Copy built assets from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Expose port
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]