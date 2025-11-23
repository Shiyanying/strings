# Build Frontend
FROM node:18-alpine as build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Setup Backend
FROM node:18-alpine
WORKDIR /app

# Install build dependencies for native modules and wget for healthcheck
RUN apk add --no-cache \
    wget \
    python3 \
    make \
    g++

# Copy Backend Dependencies and Install
COPY server/package*.json ./

# Remove any cached node_modules
RUN rm -rf node_modules package-lock.json

# Install dependencies fresh
RUN npm install --production

# Rebuild sqlite3 from source for Alpine Linux
RUN npm rebuild sqlite3 --build-from-source

# Verify sqlite3 binary exists and is correct architecture
RUN ls -la node_modules/sqlite3/build/Release/ && \
    file node_modules/sqlite3/build/Release/node_sqlite3.node

# Clean up build dependencies (keep wget for healthcheck)
RUN apk del python3 make g++

# Copy Backend Code
COPY server/ ./

# Copy Built Frontend to Backend's public folder
COPY --from=build /app/client/dist ./public

# Create data directory with proper permissions
RUN mkdir -p data/uploads && \
    chmod -R 755 data

EXPOSE 3000
CMD ["node", "server.js"]
