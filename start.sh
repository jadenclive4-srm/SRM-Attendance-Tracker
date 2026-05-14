#!/bin/sh
# ============================================
# SRM Attendance Tracker - Startup Script
# Handles Nginx config substitution and starts both Nginx + Spring Boot
# ============================================

set -e

echo "=== Starting SRM Attendance Tracker ==="

# Nginx port: use Render's $PORT or default to 8080
NGINX_PORT="${PORT:-8080}"
echo "Nginx will listen on port: ${NGINX_PORT}"

# Substitute ${PORT} placeholder in nginx.conf template
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Nginx config generated:"
cat /etc/nginx/conf.d/default.conf

# Start Spring Boot on port 8081 FIRST (it takes the longest to initialize)
echo "Starting Spring Boot on port 8081..."
java -jar /app/app.jar --server.port=8081 &
SPRING_PID=$!
echo "Spring Boot started with PID: ${SPRING_PID}"

# Wait for Spring Boot to be ready before starting Nginx,
# to prevent 502 Bad Gateway when Nginx proxies requests to a not-yet-ready backend.
echo "Waiting for Spring Boot to be ready on port 8081..."
MAX_RETRIES=45
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if wget -q -O /dev/null http://127.0.0.1:8081/ 2>/dev/null; then
        echo "Spring Boot is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting... attempt ${RETRY_COUNT}/${MAX_RETRIES}"
    sleep 2
done
if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "WARNING: Spring Boot did not become ready within timeout. Starting Nginx anyway..."
fi

# Start Nginx in the foreground (daemon off) in background
echo "Starting Nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!
echo "Nginx started with PID: ${NGINX_PID}"

# Trap SIGTERM and forward to child processes for graceful shutdown
trap 'echo "Shutting down..."; kill $NGINX_PID $SPRING_PID 2>/dev/null; exit 0' SIGTERM SIGINT

# Wait for any child process to exit
wait
