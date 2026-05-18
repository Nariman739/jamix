# Jamiwa Worker

Long-running Node.js process that holds WhatsApp connections via Baileys. Polls Postgres for outbound jobs, processes incoming messages, generates AI replies through OpenRouter, and dispatches webhooks/Telegram escalation notifications.

## Why a separate VPS

Baileys keeps a persistent WebSocket per WhatsApp account. Serverless platforms (Vercel, Cloudflare Workers, Lambda) timeout after 10–30s. We deploy worker on a real Linux VM.

## Stack

- Node 20+, TypeScript, tsx (dev) / tsc (prod)
- `@whiskeysockets/baileys` 6.7.x (stable, avoids 7.x rust-bridge ESM bug)
- Prisma 7 + Neon serverless via `@prisma/adapter-neon` (HTTP transport)
- PM2 for process management

## First-time VPS setup (Hetzner CX22 Ubuntu 24.04)

```bash
# As root, fresh server
apt update && apt upgrade -y
apt install -y curl git build-essential

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2 globally
npm install -g pm2

# Create deploy user (don't run worker as root)
adduser --disabled-password --gecos "" jamiwa
mkdir -p /opt/jamiwa
chown jamiwa:jamiwa /opt/jamiwa

# Switch to deploy user
su - jamiwa

# Clone monorepo
cd /opt/jamiwa
git clone https://github.com/Nariman739/jamix.git .

# Root deps (needed for generated Prisma client)
npm install
npx prisma generate

# Worker deps
cd worker
npm install
npm run build

# Configure env (see .env.example)
cp .env.example ../.env.local
nano ../.env.local         # paste real DATABASE_URL, WA_ENCRYPTION_KEY, etc.

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save

# Enable auto-start on reboot (run as root, copy command PM2 prints)
exit                       # back to root
env PATH=$PATH:/usr/bin pm2 startup systemd -u jamiwa --hp /home/jamiwa
systemctl enable pm2-jamiwa
```

## Updating

Manual:

```bash
ssh jamiwa@your-vps
cd /opt/jamiwa
git pull
cd worker && npm install && npm run build
pm2 restart jamiwa-worker
```

Or automated via the GitHub Actions workflow in `.github/workflows/deploy-worker.yml`
(push to `main` → SSH deploy).

## Monitoring

```bash
pm2 status                # process state
pm2 logs jamiwa-worker    # tail logs
pm2 monit                 # interactive dashboard
tail -f /var/log/jamiwa-worker.out.log
```

## Logs locations

- stdout: `/var/log/jamiwa-worker.out.log`
- stderr: `/var/log/jamiwa-worker.error.log`

## Capacity

Single CX22 (€4.51/month, 2 vCPU / 4GB RAM) holds 50–80 WhatsApp connections comfortably. Scaling beyond:

- Vertical: bump to CX32 (€7.50, 4GB→8GB)
- Horizontal: add more workers with unique `WORKER_NODE_KEY` env; gateway already does sticky routing by `WAInstance.workerNodeId`
