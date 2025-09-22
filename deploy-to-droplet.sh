#!/bin/bash

# Ghost Agent Zero - DigitalOcean Deployment Script
# Run this on your new droplet after creation

set -e

echo "🚀 Starting Ghost Agent Zero deployment..."

# Update system
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
apt-get install -y docker-compose-plugin

# Set up data directory on the mounted volume
echo "💾 Setting up persistent storage..."
mkdir -p /mnt/volume_sfo3_01/ghost-data
cd /mnt/volume_sfo3_01/ghost-data

# Clone the repository
echo "📥 Cloning Ghost Agent Zero..."
git clone https://github.com/Kironkeys/agent-zero-lite.git
cd agent-zero-lite

# Create docker-compose override for production
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  falkordb:
    image: falkordb/falkordb:latest
    container_name: falkordb
    ports:
      - "6379:6379"
    volumes:
      - /mnt/volume_sfo3_01/ghost-data/falkor:/data
    networks:
      - ghost-network
    restart: unless-stopped

  agent-zero-lite:
    build: .
    container_name: agent-zero-lite
    ports:
      - "80:80"
      - "443:443"
    environment:
      - API_KEY_OPENAI=${API_KEY_OPENAI}
      - API_KEY_OPENROUTER=${API_KEY_OPENROUTER}
      - FALKORDB_HOST=falkordb
      - FALKORDB_PORT=6379
      - USE_FALKORDB=true
      - NEO4J_DISABLED=true
      - WEB_UI_HOST=0.0.0.0
      - WEB_UI_PORT=80
      - MCP_SERVER_TOKEN=test-token-123
    volumes:
      - /mnt/volume_sfo3_01/ghost-data/memory:/a0/memory
      - /mnt/volume_sfo3_01/ghost-data/logs:/a0/logs
      - /mnt/volume_sfo3_01/ghost-data/outputs:/a0/outputs
      - /mnt/volume_sfo3_01/ghost-data/knowledge:/a0/knowledge
      - /mnt/volume_sfo3_01/ghost-data/instruments:/a0/instruments
      - /mnt/volume_sfo3_01/ghost-data/tmp:/a0/tmp
    depends_on:
      - falkordb
    networks:
      - ghost-network
    restart: unless-stopped

networks:
  ghost-network:
    driver: bridge
EOF

# Create .env file
echo "🔑 Setting up environment variables..."
cat > .env << 'EOF'
API_KEY_OPENAI=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
API_KEY_OPENROUTER=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
EOF

# Build and start services
echo "🏗️ Building Docker images..."
docker compose build

echo "🚀 Starting services..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
echo "✅ Checking service status..."
docker ps

# Get the droplet's IP
IP=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)

echo "
🎉 ========================================
🎉 Ghost Agent Zero deployed successfully!
🎉 ========================================

Access your Ghost Agent at:
👉 http://$IP

Services running:
- Ghost Agent Zero: Port 80
- FalkorDB: Port 6379 (internal)

All data is persisted to: /mnt/volume_sfo3_01/ghost-data

To view logs:
docker logs agent-zero-lite
docker logs falkordb

To restart services:
docker compose restart

🚀 Your Ghost is ready for multiple users!
"