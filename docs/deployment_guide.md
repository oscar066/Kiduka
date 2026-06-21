# Deployment Guide — Kiduka on Contabo VPS (Ubuntu)

Deploys Kiduka on the shared Contabo server alongside NasomaTTS.
nginx runs as a **host system service** (not in Docker) and routes traffic
by domain name to each app's Docker containers.

## Architecture

```
Internet
   │
   └── kiduka-labs.co.ke ──────────────────────────────────────┐
                                                               ▼
                                             nginx (host service, ports 80/443)
                                             routes by domain → localhost
                                                       │
                                              127.0.0.1:3000/8000
                                                       │
                                              [Kiduka docker-compose.prod.yml]
                                              client   api   postgres
```

**Key decisions:**
- nginx runs as a host system service — not inside Docker
- Ports are bound to `127.0.0.1` only (not publicly accessible)
- All apps share one nginx config at `/etc/nginx/sites-available/apps.conf`
- Adding a new app = add a server block to apps.conf, start a new compose

---

## Part 1 — One-time Server Setup

### 1.1 SSH into the server

```bash
ssh root@<SERVER_IP>
```

### 1.2 Run the bootstrap script

Installs Docker, Git, UFW firewall (ports 22, 80, 443):

```bash
apt update && apt install -y git
git clone <YOUR_GITHUB_REPO_URL>
cd Kiduka
chmod +x scripts/setup_server.sh
./scripts/setup_server.sh
```

### 1.3 Install nginx on the host

```bash
apt install -y nginx
systemctl enable nginx
```

### 1.4 Install the shared nginx config

The config is managed in the shared `nginx/` repo that sits alongside both app
repos locally (`~/Desktop/dev/nginx/apps.conf`). It covers all apps on the
server — no manual domain substitution needed.

```bash
# On your LOCAL machine:
scp ~/Desktop/dev/nginx/apps.conf root@<SERVER_IP>:/etc/nginx/sites-available/apps.conf
```

On the server, enable the config:

```bash
ln -s /etc/nginx/sites-available/apps.conf /etc/nginx/sites-enabled/apps.conf
rm -f /etc/nginx/sites-enabled/default
```

> ⚠️ **This symlink step is critical — do not skip it.**  
> Without it nginx serves the default page and both apps return a 521 error.

Verify it is in place:

```bash
ls /etc/nginx/sites-enabled/
# Should show: apps.conf
# Should NOT show: default
```

> Don't test or reload nginx yet — SSL certs must be in place first.

### 1.5 Open firewall ports

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

## Part 2 — SSL Certificates

nginx needs Cloudflare Origin Certificates for each domain.

```bash
mkdir -p /etc/nginx/ssl
chmod 700 /etc/nginx/ssl
```

### Kiduka cert

1. Cloudflare → `kiduka-labs.co.ke` → **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Add `kiduka-labs.co.ke` and `*.kiduka-labs.co.ke` as hostnames, RSA 2048, 15 years
3. Save as `kiduka-origin.crt` and `kiduka-origin.key` locally
4. Upload:

```bash
scp kiduka-origin.crt root@<SERVER_IP>:/etc/nginx/ssl/
scp kiduka-origin.key root@<SERVER_IP>:/etc/nginx/ssl/
chmod 600 /etc/nginx/ssl/*.key
```

### Test and start nginx

```bash
nginx -t
systemctl start nginx
systemctl status nginx
```

---

## Part 3 — Deploy Kiduka

### 3.1 Clone the repository

```bash
cd ~
git clone <YOUR_GITHUB_REPO_URL> Kiduka
cd Kiduka
```

### 3.2 Create the environment file

```bash
cp .env.example .env
nano .env
```

| Variable | Value |
|---|---|
| `POSTGRES_DB` | `agricultural_api` |
| `POSTGRES_USER` | `agri_user` |
| `POSTGRES_PASSWORD` | strong password |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://kiduka-labs.co.ke` |
| `PGADMIN_DEFAULT_EMAIL` | your email |
| `PGADMIN_DEFAULT_PASSWORD` | strong password |

### 3.3 Run the deploy script

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 3.4 Verify

```bash
docker compose -f docker-compose.prod.yml ps
# All services should show Up/healthy
```

---

## Part 4 — Cloudflare DNS

1. Cloudflare → `kiduka-labs.co.ke` → **DNS** → **Records**
2. Add **A record**: `@` → `<SERVER_IP>`, **Proxied** (orange cloud ON)
3. Add **A record**: `www` → `<SERVER_IP>`, **Proxied**
4. **SSL/TLS** → **Overview** → set mode to **Full (Strict)**

> Full (Strict) is required because nginx uses a Cloudflare Origin Certificate.
> "Flexible" will cause redirect loops — do not use it.

---

## Part 5 — GitHub Actions (auto-deploy on push)

The workflow at [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
SSHs into the server and runs `scripts/deploy.sh` on every push to `main`.

Add these secrets to your GitHub repo (**Settings → Secrets → Actions**):

| Secret | Value |
|---|---|
| `SERVER_IP` | your server IP |
| `SERVER_USER` | `root` |
| `SSH_PRIVATE_KEY` | private key whose public key is in `~/.ssh/authorized_keys` on the server |
| `SSH_PORT` | `22` |

> Kiduka and NasomaTTS share the same server — reuse the same SSH key and IP across both repos.

---

## Routine Operations

### Redeploy after code changes
```bash
cd ~/Kiduka && ./scripts/deploy.sh
```

### Update nginx config (after adding a new app)
```bash
# Copy updated apps.conf from local machine
scp ~/Desktop/dev/nginx/apps.conf root@<SERVER_IP>:/etc/nginx/sites-available/apps.conf
nginx -t && systemctl reload nginx
```

### View logs
```bash
cd ~/Kiduka
docker compose -f docker-compose.prod.yml logs -f client
docker compose -f docker-compose.prod.yml logs -f api
```

### Restart a single service
```bash
docker compose -f docker-compose.prod.yml restart client
```

### Stop everything
```bash
docker compose -f docker-compose.prod.yml down
```

### Add a new app to the server
1. Update `~/Desktop/dev/nginx/apps.conf` locally — add server blocks with new domain + ports
2. Upload SSL cert for the new domain to `/etc/nginx/ssl/`
3. SCP the updated `apps.conf` to the server, then `nginx -t && systemctl reload nginx`
4. Clone repo, create `.env`, run `docker compose up -d --build`
5. Add DNS A records in Cloudflare, set SSL/TLS to Full (Strict)

---

## Troubleshooting

| Problem | Check |
|---|---|
| 502 Bad Gateway | `docker compose -f docker-compose.prod.yml ps` — is the container running? |
| nginx won't start | Port 80/443 already in use: `ss -tlnp \| grep -E ':80\|:443'` |
| 521 Web server down | `ls /etc/nginx/sites-enabled/` — `apps.conf` symlink missing; run `ln -s /etc/nginx/sites-available/apps.conf /etc/nginx/sites-enabled/apps.conf && systemctl reload nginx` |
| nginx config error | `nginx -t` shows the exact line |
| SSL error in browser | Verify cert files exist: `ls /etc/nginx/ssl/` |
| Redirect loop | SSL/TLS mode in Cloudflare must be **Full (Strict)**, not Flexible |
| NextAuth redirect loop | `NEXTAUTH_URL` in `.env` must match the actual public domain |
| Auto-deploy not triggering | Check GitHub Actions tab; verify SSH secrets are correct |
