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

# Build and start containers
echo "Building and starting containers..."
# We use sudo if the user isn't in the docker group yet (which happens on first run)
if groups | grep -q "docker"; then
    docker compose up -d --build
    docker compose restart nginx
    
    echo "Running database migrations..."
    docker compose exec -T postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-agricultural_api} -f /docker-entrypoint-initdb.d/02-migrate.sql
else
    sudo docker compose up -d --build
    sudo docker compose restart nginx
    
    echo "Running database migrations..."
    sudo docker compose exec -T postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-agricultural_api} -f /docker-entrypoint-initdb.d/02-migrate.sql
fi

echo "Deployment complete! Services should be running."
echo "Check status with: docker compose ps"
