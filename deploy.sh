#!/bin/bash
set -euo pipefail

# ============================================================
# Reveal Bot — EC2 Deployment Script
# Usage:
#   Option A (Docker):    ./deploy.sh docker
#   Option B (Bare Node): ./deploy.sh node
# ============================================================

APP_DIR="/home/ubuntu/reveal_bot"
LOG_DIR="/home/ubuntu/logs"
DOMAIN="reveal.ac"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# -----------------------------------------------------------
# Pre-checks
# -----------------------------------------------------------
check_env() {
    if [ ! -f "$APP_DIR/.env.local" ]; then
        err ".env.local not found. Copy .env.local.example and fill in your Supabase credentials:
  cp .env.local.example .env.local
  nano .env.local"
    fi
    log ".env.local found"
}

# -----------------------------------------------------------
# Option A: Docker deployment
# -----------------------------------------------------------
deploy_docker() {
    log "Deploying with Docker..."

    # Install Docker if missing
    if ! command -v docker &> /dev/null; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker "$USER"
        warn "Docker installed. You may need to log out and back in for group changes."
    fi

    # Install docker compose plugin if missing
    if ! docker compose version &> /dev/null; then
        log "Installing Docker Compose plugin..."
        sudo apt-get update && sudo apt-get install -y docker-compose-plugin
    fi

    # SSL cert
    setup_ssl

    cd "$APP_DIR"

    # Source env for build args
    set -a
    source .env.local
    set +a

    # Build and start
    docker compose down 2>/dev/null || true
    docker compose build --no-cache
    docker compose up -d

    log "Docker deployment complete!"
    docker compose ps
}

# -----------------------------------------------------------
# Option B: Bare Node + PM2 + Nginx
# -----------------------------------------------------------
deploy_node() {
    log "Deploying with Node + PM2..."

    # Install Node 20 if missing
    if ! command -v node &> /dev/null || [[ "$(node -v)" != v20* ]]; then
        log "Installing Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi

    # Install PM2
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        sudo npm install -g pm2
    fi

    # Install Nginx
    if ! command -v nginx &> /dev/null; then
        log "Installing Nginx..."
        sudo apt-get update && sudo apt-get install -y nginx
    fi

    # Create log dir
    mkdir -p "$LOG_DIR"

    cd "$APP_DIR"

    # Install deps and build
    log "Installing dependencies..."
    npm ci

    log "Building Next.js..."
    npm run build

    # Setup Nginx (non-Docker version — proxy to localhost:3000)
    setup_nginx_bare
    setup_ssl

    # Start/restart with PM2
    pm2 delete reveal-bot 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

    log "Node deployment complete!"
    pm2 status
}

# -----------------------------------------------------------
# Nginx config for bare Node (not Docker)
# -----------------------------------------------------------
setup_nginx_bare() {
    log "Configuring Nginx..."

    sudo tee /etc/nginx/sites-available/reveal-bot > /dev/null <<'NGINX'
server {
    listen 80;
    server_name reveal.ac www.reveal.ac;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name reveal.ac www.reveal.ac;

    ssl_certificate /etc/letsencrypt/live/reveal.ac/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/reveal.ac/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

    sudo ln -sf /etc/nginx/sites-available/reveal-bot /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
}

# -----------------------------------------------------------
# SSL with Let's Encrypt
# -----------------------------------------------------------
setup_ssl() {
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        log "SSL cert already exists for $DOMAIN"
        return
    fi

    log "Obtaining SSL certificate..."
    sudo mkdir -p /var/www/certbot

    if ! command -v certbot &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y certbot
    fi

    sudo certbot certonly --webroot \
        -w /var/www/certbot \
        -d "$DOMAIN" -d "www.$DOMAIN" \
        --non-interactive --agree-tos \
        --email admin@$DOMAIN

    # Auto-renew cron
    (sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | sudo crontab -

    log "SSL certificate obtained and auto-renew configured"
}

# -----------------------------------------------------------
# Main
# -----------------------------------------------------------
main() {
    check_env

    case "${1:-}" in
        docker)
            deploy_docker
            ;;
        node)
            deploy_node
            ;;
        *)
            echo "Usage: $0 {docker|node}"
            echo ""
            echo "  docker  — Deploy with Docker Compose (recommended)"
            echo "  node    — Deploy with PM2 + Nginx directly"
            exit 1
            ;;
    esac

    echo ""
    log "========================================="
    log "  Reveal Bot is live at https://$DOMAIN"
    log "========================================="
}

main "$@"
