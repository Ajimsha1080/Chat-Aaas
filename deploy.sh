#!/usr/bin/env bash
# ==============================================================================
# Chat-AaaS — Automated AWS EC2 One-Click Deployment Script
# ==============================================================================
set -e

echo "🚀 Starting Chat-AaaS AWS EC2 Deployment..."

# 1. Check for Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Installing Docker..."
    sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "✅ Docker installed successfully."
fi

# 2. Check for .env file
if [ ! -f .env ]; then
    echo "⚠️ .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "🔑 Please edit .env with your production API keys before continuing!"
fi

# 3. Pull latest changes if inside a Git repository
if [ -d .git ]; then
    echo "📦 Pulling latest updates from Git..."
    git pull origin main || echo "Proceeding with current code state..."
fi

# 4. Stop existing containers and clean unused resources
echo "🧹 Stopping old containers..."
docker compose down --remove-orphans || true

# 5. Build and launch services in detached mode
echo "🏗️ Building and starting Docker containers..."
docker compose up -d --build

# 6. Wait for health checks
echo "⏳ Waiting for backend health check..."
sleep 5

docker compose ps

echo "======================================================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================================================================"
echo "🌐 Frontend URL : http://$(curl -s ifconfig.me)"
echo "🔌 Backend API  : http://$(curl -s ifconfig.me):8000"
echo "🏥 Health Check : http://$(curl -s ifconfig.me):8000/health"
echo "======================================================================"
