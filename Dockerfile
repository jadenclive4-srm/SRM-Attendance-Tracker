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

# Accept API base URL at build time (optional — defaults to "" so API calls go through Nginx proxy)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-""}

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

# Install JRE to run Spring Boot + gettext for envsubst
RUN apk add --no-cache openjdk17-jre gettext wget

WORKDIR /app

# Copy frontend build into Nginx's web root
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy backend JAR
COPY --from=backend-builder /app/target/*.jar app.jar

# Copy Nginx config template (placeholder $PORT gets substituted at runtime by envsubst)
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port (Render sets PORT env var)
EXPOSE 8080

# Use the startup script that handles Nginx config substitution + service orchestration
CMD ["/app/start.sh"]