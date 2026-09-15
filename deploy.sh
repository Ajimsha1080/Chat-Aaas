#!/usr/bin/env bash
# ==============================================================================
# Chat-AaaS — Automated AWS EC2 One-Click Deployment Script
# ==============================================================================
set -e

echo "🚀 Starting Chat-AaaS AWS EC2 Deployment..."

# 1. Check for Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose || sudo apt-get install -y docker.io docker-compose-plugin
    sudo usermod -aG docker $USER || true
    sudo systemctl start docker || true
    sudo systemctl enable docker || true
    echo "✅ Docker installed successfully."
fi

# 2. Determine Docker Compose command variant
COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "Installing docker-compose..."
        sudo apt-get install -y docker-compose || true
        COMPOSE_CMD="docker-compose"
    fi
fi

echo "✅ Using Compose runner: $COMPOSE_CMD"

# 3. Check for .env file
if [ ! -f .env ]; then
    echo "⚠️ .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "🔑 Please edit .env with your production API keys before continuing!"
fi

# 4. Pull latest changes if inside a Git repository
if [ -d .git ]; then
    echo "📦 Pulling latest updates from Git..."
    git pull origin main || echo "Proceeding with current code state..."
fi

# 5. Stop existing containers and clean unused resources
echo "🧹 Stopping old containers..."
$COMPOSE_CMD down --remove-orphans || true

# 6. Build and launch services in detached mode
echo "🏗️ Building and starting Docker containers..."
$COMPOSE_CMD up -d --build

# 7. Wait for health checks
echo "⏳ Waiting for backend health check..."
sleep 5

$COMPOSE_CMD ps

echo "======================================================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================================================================"
echo "🌐 Frontend URL : http://$(curl -s ifconfig.me || echo 'YOUR_EC2_IP')"
echo "🔌 Backend API  : http://$(curl -s ifconfig.me || echo 'YOUR_EC2_IP'):8000"
echo "🏥 Health Check : http://$(curl -s ifconfig.me || echo 'YOUR_EC2_IP'):8000/health"
echo "======================================================================"
