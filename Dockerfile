# ============================================
# SRM Attendance Tracker - Single Dockerfile
# Builds & serves both backend (Spring Boot) and frontend (React/Vite)
# Designed for single-service Render deployment
# ============================================

# ---- Stage 1: Build Frontend (React + Vite) ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --include=dev
COPY frontend/ .

# Accept API base URL at build time (optional — defaults to same-origin)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ---- Stage 2: Build Backend (Spring Boot + Maven) ----
FROM eclipse-temurin:17-jdk-alpine AS backend-builder

WORKDIR /app
RUN apk add --no-cache maven

COPY backend/pom.xml .
RUN mvn dependency:go-offline -B || true

COPY backend/src ./src
RUN mvn clean package -DskipTests -B

# ---- Stage 3: Runtime (Nginx + JRE) ----
FROM nginx:1.27-alpine

# Install JRE to run Spring Boot + envsubst for Nginx config variable substitution
RUN apk add --no-cache openjdk17-jre gettext

WORKDIR /app

# Copy frontend build into Nginx's web root
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy backend JAR
COPY --from=backend-builder /app/target/*.jar app.jar

# Copy Nginx config template (placeholder $PORT gets substituted at runtime by envsubst)
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid

USER appuser

# Expose port (Render sets PORT env var)
EXPOSE 8080

# Startup:
#   1. Substitute $PORT in nginx config template using envsubst
#   2. Start Nginx in background (listens on $PORT)
#   3. Launch Spring Boot on port 8081 (Nginx proxies /api/* to it)
CMD ["sh", "-c", "export NGINX_PORT=${PORT:-8080} && envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx && java -jar app.jar --server.port=8081"]