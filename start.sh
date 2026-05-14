#!/bin/sh
# ============================================
# SRM Attendance Tracker - Startup Script
# Orchestrates Nginx (port 8080) + Spring Boot (port 8081)
# ============================================

set -e

echo "========================================"
echo "SRM Attendance Tracker - Container Start"
echo "========================================"

# 1. Resolve port configuration
NGINX_PORT="${PORT:-8080}"
BACKEND_PORT="8081"

echo "[INFO] Configuration:"
echo "  - Nginx port: ${NGINX_PORT}"
echo "  - Backend port: ${BACKEND_PORT}"
echo "  - Environment: ${SPRING_PROFILES_ACTIVE:-dev}"

# 2. Generate Nginx config from template
echo "[INFO] Generating Nginx configuration..."
if ! envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf; then
    echo "[ERROR] Failed to generate Nginx config"
    exit 1
fi
echo "[DEBUG] Nginx config generated successfully"

# 3. Start Spring Boot backend
echo "[INFO] Starting Spring Boot on port ${BACKEND_PORT}..."
if ! java -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-prod} \
     -Dcom.sun.management.jmxremote=false \
     -Xmx256m -Xms128m \
     -jar /app/app.jar --server.port=${BACKEND_PORT} > /tmp/spring.log 2>&1 &
then
    echo "[ERROR] Failed to start Spring Boot"
    cat /tmp/spring.log
    exit 1
fi
SPRING_PID=$!
echo "[INFO] Spring Boot started (PID: ${SPRING_PID})"

# 4. Wait for Spring Boot to be healthy
echo "[INFO] Waiting for Spring Boot to be ready..."
MAX_RETRIES=60
RETRY_COUNT=0
RETRY_INTERVAL=2

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://127.0.0.1:${BACKEND_PORT}/actuator/health >/dev/null 2>&1; then
        echo "[SUCCESS] Spring Boot is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $((RETRY_COUNT % 5)) -eq 0 ]; then
        echo "[INFO] Still waiting... (${RETRY_COUNT}/${MAX_RETRIES})"
    fi
    sleep $RETRY_INTERVAL
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "[WARNING] Spring Boot health check timeout after $((MAX_RETRIES * RETRY_INTERVAL))s"
    echo "[DEBUG] Checking Spring Boot logs:"
    tail -20 /tmp/spring.log
fi

# 5. Start Nginx
echo "[INFO] Starting Nginx on port ${NGINX_PORT}..."
nginx -g "daemon off;" &
NGINX_PID=$!
echo "[INFO] Nginx started (PID: ${NGINX_PID})"

echo "========================================"
echo "Container started successfully!"
echo "  Frontend: http://0.0.0.0:${NGINX_PORT}"
echo "  Backend:  http://127.0.0.1:${BACKEND_PORT}"
echo "========================================"

# 6. Graceful shutdown handler
shutdown_handler() {
    echo ""
    echo "[INFO] Shutdown signal received, gracefully stopping services..."
    
    # Stop Nginx
    if [ -n "$NGINX_PID" ] && kill -0 $NGINX_PID 2>/dev/null; then
        echo "[INFO] Stopping Nginx (PID: ${NGINX_PID})..."
        kill -TERM $NGINX_PID 2>/dev/null || true
        sleep 5
        kill -9 $NGINX_PID 2>/dev/null || true
    fi
    
    # Stop Spring Boot
    if [ -n "$SPRING_PID" ] && kill -0 $SPRING_PID 2>/dev/null; then
        echo "[INFO] Stopping Spring Boot (PID: ${SPRING_PID})..."
        kill -TERM $SPRING_PID 2>/dev/null || true
        sleep 5
        kill -9 $SPRING_PID 2>/dev/null || true
    fi
    
    echo "[INFO] Shutdown complete"
    exit 0
}

trap shutdown_handler SIGTERM SIGINT

# 7. Keep container running and wait for child processes
echo "[INFO] Services running. Waiting for termination signal..."
wait
