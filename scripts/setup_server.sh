#!/bin/bash

# setup_server.sh
# Usage: ./setup_server.sh
# Should be run as root

set -e

echo "Starting server setup..."

# 1. Update System
echo "Updating system..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git ufw htop ca-certificates gnupg

# 2. Configure Firewall (UFW)
echo "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
# Allow 5050 for pgAdmin optionally, better to tunnel but user might want it
# ufw allow 5050/tcp
echo "y" | ufw enable
ufw status

# 3. Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "Docker already installed."
fi

# 4. Cleanup
apt-get autoremove -y

echo "Server setup complete! Docker and Git are ready."
echo "You can now clone your repository and run the deploy script."
