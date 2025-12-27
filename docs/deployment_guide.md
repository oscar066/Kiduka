# Deployment Guide: Kiduka App on Contabo VPS (Ubuntu)

This guide walks you through deploying the Kiduka application to a generic VPS (like Contabo), configuring security, and running the application.

## Prerequisites
- **Server Access**: IP Address and Root password (sent by Contabo).
- **GitHub Repository**: The code is pushed and accessible.

## Step 1: Connect to your Server

Open your terminal and SSH into your new server:
```bash
ssh root@<YOUR_SERVER_IP>
# Enter password when prompted
```

## Step 2: Bootstrap Git
Since the server is fresh, we need Git to get the code.
```bash
apt update && apt install -y git
```

## Step 3: Clone Repository
Clone your project repository.
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd Kiduka
```

## Step 4: Run Server Setup Script
We have prepared a script `scripts/setup_server.sh` that will:
- Update the OS and packages.
- Install Docker & Docker Compose.
- Configure UFW Firewall (Ports 22, 80, 443).

Run it:
```bash
chmod +x scripts/setup_server.sh
./scripts/setup_server.sh
```
*Note: This might take a few minutes as it updates the system.*

## Step 5: Configure Application
Create your production environment file.
1. Create `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
2. **Critical Updates**:
   - `POSTGRES_PASSWORD`: Set a strong password.
   - `NEXTAUTH_SECRET`: Generate a random string (e.g., `openssl rand -base64 32`).
   - `NEXTAUTH_URL`: Set to `http://<YOUR_SERVER_IP>` (or your domain if configured).

## Step 6: Deploy Application
Now built and start the containers using the deploy script.
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## Step 7: Verification
1. Open your browser to `http://<YOUR_SERVER_IP>`.
2. check if the application loads.
3. If you have "502 Bad Gateway" initially, wait 30s for the containers to fully start.

## Step 8: (Optional) Domain & SSL
If you have a domain (e.g. from Namecheap/GoDaddy):
1. Create an **A Record** pointing to your Server IP.
2. We recommend using Cloudflare (Free) for SSL:
   - Point NameServers to Cloudflare.
   - Add A Record in Cloudflare.
   - Enable "Flexible" or "Full" SSL in Cloudflare.


