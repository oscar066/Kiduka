#!/bin/bash

# Exit on error
set -e

echo "Starting deployment..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."
echo "Working in directory: $(pwd)"

# Load environment variables
if [ -f .env ]; then
    # Only export lines that are valid KEY=VALUE pairs and not comments
    export $(grep -v '^#' .env | grep -E '^[A-Za-z0-9_]+=' | xargs)
    echo "Environment variables loaded."
else
    echo "Warning: .env file not found."
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing Docker..."
    # Add Docker's official GPG key:
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Add the repository to Apt sources:
    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update

    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group to run without sudo
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to log out and back in for group changes to take effect."
else
    echo "Docker is already installed."
fi

# Pull latest changes
echo "Syncing with repository..."
git fetch origin main
git reset --hard origin/main

# SSL Certificate Sanity Check
echo "Checking for SSL certificates..."
if [ ! -f .server-certificates/origin.crt ] || [ ! -f .server-certificates/origin.key ]; then
    echo "❌ ERROR: SSL certificates not found in .server-certificates/"
    echo "Please upload them manually using: scp -r .server-certificates/ root@84.247.161.30:~/Kiduka/"
    exit 1
fi
echo "✅ Certificates found."

# Build and start containers
echo "Building and starting containers..."
DOCKER_CMD="docker compose -f docker-compose.prod.yml"
if ! groups | grep -q "docker"; then
    DOCKER_CMD="sudo $DOCKER_CMD"
fi

$DOCKER_CMD up -d --build
$DOCKER_CMD restart nginx

# Run database migrations
echo "Running database migrations..."
echo "Waiting for database to be healthy..."
for i in {1..10}; do
    if $DOCKER_CMD exec -T postgres pg_isready -U ${POSTGRES_USER:-agri_user} -d ${POSTGRES_DB:-agricultural_api} > /dev/null 2>&1; then
        echo "✅ Database is ready."
        break
    fi
    echo "Waiting... ($i/10)"
    sleep 3
done

$DOCKER_CMD exec -T postgres psql -U ${POSTGRES_USER:-agri_user} -d ${POSTGRES_DB:-agricultural_api} -f /docker-entrypoint-initdb.d/02-migrate.sql

echo "Deployment complete! Services should be running."
echo "Check status with: docker compose -f docker-compose.prod.yml ps"
