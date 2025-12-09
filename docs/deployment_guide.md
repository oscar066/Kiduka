# Deployment Guide: Kiduka MVP on Google Cloud Platform

This guide walks you through deploying the Kiduka application to a Google Cloud Compute Engine VM, configuring a custom domain with Cloudflare, and setting up Nginx.

## Prerequisites
- Google Cloud Platform Account
- Cloudflare Account (with your domain added)
- Terminal access

## Step 1: Create a Google Cloud Compute Engine VM

1.  **Go to GCP Console**: Navigate to [Compute Engine > VM instances](https://console.cloud.google.com/compute/instances).
2.  **Create Instance**: Click "Create Instance".
3.  **Name**: `kiduka-mvp` (or similar).
4.  **Region**: Choose a region close to your users (e.g., `us-central1` or `europe-west1`).
5.  **Machine Type**: `e2-medium` (2 vCPU, 4GB memory) is recommended for this stack. `e2-micro` might be too small for building Next.js and running Postgres.
6.  **Boot Disk**:
    - OS: **Ubuntu**
    - Version: **Ubuntu 22.04 LTS** (or 20.04 LTS)
    - Size: **20 GB** (Standard persistent disk is fine)
7.  **Firewall**:
    - Check **Allow HTTP traffic**
    - Check **Allow HTTPS traffic**
8.  **Create**: Click "Create" and wait for the instance to start.
9.  **Note External IP**: Once running, copy the **External IP** address.

## Step 2: Configure Cloudflare DNS

1.  **Log in to Cloudflare**: Select your domain.
2.  **DNS Settings**: Go to the **DNS** tab.
3.  **Add Record**:
    - **Type**: `A`
    - **Name**: `@` (root) or `app` (subdomain)
    - **IPv4 address**: Paste the **External IP** from GCP.
    - **Proxy status**: **Proxied** (Orange cloud) - This gives you free SSL and DDoS protection.
4.  **SSL/TLS Settings**:
    - Go to **SSL/TLS** > **Overview**.
    - Set encryption mode to **Flexible** (if Nginx listens on port 80 without SSL) or **Full** (if Nginx has a self-signed cert).
    - **Recommendation**: Start with **Flexible** since our Nginx config listens on port 80. Cloudflare handles HTTPS to the user, and talks HTTP to your server.

## Step 3: Deploy Code to VM

1.  **SSH into VM**:
    - From GCP Console, click "SSH" next to your instance.
    - Or use your terminal if you added your SSH key.

2.  **Clone Repository**:
    ```bash
    git clone <YOUR_GITHUB_REPO_URL>
    cd Kiduka
    ```
    *(You may need to generate an SSH key on the VM and add it to GitHub, or use HTTPS with a token)*

3.  **Environment Variables**:
    - Create `.env` file in the root directory (or copy `.env.example` if you have one).
    - **Important**: Ensure `NEXT_PUBLIC_API_URL` in `docker-compose.yml` or build args matches your domain (e.g., `https://yourdomain.com/api`). Since we set it to `/api` in the compose file, it should work automatically relative to the domain.

4.  **Run Deployment Script**:
    ```bash
    chmod +x scripts/deploy.sh
    ./scripts/deploy.sh
    ```
    - This script will install Docker and start the containers.

## Step 4: Verify Deployment

1.  **Visit your domain**: Open `https://yourdomain.com` in your browser.
2.  **Check API**: Try logging in or signing up.
3.  **Troubleshooting**:
    - If site doesn't load, check Cloudflare DNS settings.
    - If "502 Bad Gateway", check if containers are running: `docker compose ps`.
    - View logs: `docker compose logs -f nginx` or `docker compose logs -f client`.

## Step 5: Database Management (Optional)

- **pgAdmin** is running on port `5050`.
- To access it securely, you might want to tunnel via SSH or allow port 5050 in GCP Firewall (not recommended for production).
- **SSH Tunnel**:
    ```bash
    ssh -L 5050:localhost:5050 user@vm-ip
    ```
    Then open `http://localhost:5050` on your local machine.

## Step 6: Security Checklist (Critical)

1.  **Change Secrets**:
    - Update `NEXTAUTH_SECRET` in `docker-compose.yml` or `.env` to a strong random string.
    - Update `POSTGRES_PASSWORD` and `PGADMIN_DEFAULT_PASSWORD` in `.env`.
    - Update `JWT_SECRET_KEY` and `SESSION_SECRET_KEY` in `api/.env` (or pass as env vars).
2.  **Firewall**:
    - Ensure only ports `80` (HTTP), `443` (HTTPS), and `22` (SSH) are open in GCP Firewall.
    - Do NOT open port `5432` (Postgres) or `5050` (pgAdmin) to the public internet.
3.  **SSL**:
    - Ensure Cloudflare SSL/TLS is set to **Flexible** (if Nginx is HTTP) or **Full** (if you add certs to Nginx).

