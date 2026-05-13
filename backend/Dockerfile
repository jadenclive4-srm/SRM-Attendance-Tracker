# ============================================
# SRM Attendance Tracker - Backend Dockerfile
# ============================================
# Stage 1: Build the application
# ============================================
FROM eclipse-temurin:17 AS builder

WORKDIR /app

# Copy Maven wrapper and project files
COPY mvnw .
COPY mvnw.cmd .
COPY .mvn .mvn
COPY pom.xml .

# Make Maven wrapper executable
RUN chmod +x mvnw

# Download dependencies first (caching optimization)
RUN ./mvnw dependency:go-offline -B || true

# Copy source code
COPY src ./src

# Build the application (skip tests for production build)
RUN ./mvnw clean package -DskipTests -B

# ============================================
# Stage 2: Runtime image
# ============================================
FROM eclipse-temurin:17

WORKDIR /app

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Do NOT copy serviceAccountKey.json inside the image
# Firebase credentials must be provided via:
#   - Environment variable (GOOGLE_APPLICATION_CREDENTIALS), OR
#   - Docker volume mount at runtime, OR
#   - Render Dashboard Secret Files

# Set ownership to the non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port (documentation only — Render assigns PORT dynamically)
EXPOSE 8080

# Render sets the PORT environment variable at runtime (typically 10000)
# Spring Boot automatically maps SERVER_PORT env var to server.port property
# Use a shell entrypoint to evaluate PORT at runtime and pass it to Spring Boot
ENTRYPOINT ["sh", "-c", "java -jar app.jar --server.port=${PORT:-9090}"]