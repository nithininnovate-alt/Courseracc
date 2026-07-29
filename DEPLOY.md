# Self-hosting Central Global University (Google Cloud VM / any Linux server)

This guide takes the app from a fresh Linux box (e.g. a Google Compute Engine
VM running Ubuntu 22.04/24.04) to a production deployment behind nginx with
HTTPS. Nothing in the app requires Replit at runtime as long as the
environment variables below are set.

The app has two parts:

| Part | What it is | How it runs in production |
|---|---|---|
| `artifacts/api-server` | Express API (port from `PORT`) | Node process managed by systemd |
| `artifacts/portal` | React/Vite SPA | Static files served by nginx; `/api` proxied to the API server |

---

## 1. Prerequisites on the VM

```bash
# Node.js 24 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs nginx

# pnpm
sudo corepack enable
corepack prepare pnpm@latest --activate

node -v   # v24.x
pnpm -v
```

Create an app user and directory:

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin cgu
sudo mkdir -p /opt/cgu && sudo chown cgu:cgu /opt/cgu
```

## 2. PostgreSQL

Use either Cloud SQL (recommended on GCP) or a local Postgres:

```bash
sudo apt-get install -y postgresql
sudo -u postgres psql -c "CREATE USER cgu WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c "CREATE DATABASE cgu OWNER cgu;"
```

Your connection string is then
`DATABASE_URL=postgresql://cgu:CHANGE_ME@127.0.0.1:5432/cgu`.
For Cloud SQL, use the instance's connection string instead (public IP +
authorized network, or the Cloud SQL Auth Proxy). The app only ever uses
`DATABASE_URL` — no other database configuration exists.

### Create the schema (Drizzle)

From the repo checkout, with `DATABASE_URL` exported:

```bash
export DATABASE_URL=postgresql://cgu:CHANGE_ME@127.0.0.1:5432/cgu
pnpm --filter @workspace/db run push        # applies the schema
# use `pnpm --filter @workspace/db run push-force` to skip interactive prompts
```

Re-run the same command after pulling code updates that change the schema.

## 3. Google Cloud Storage (file uploads)

The app stores uploads (student documents, course materials, newsletter
images) in Google Cloud Storage. On Replit this goes through Replit App
Storage; when self-hosting, switch to the `gcs` driver:

1. Create a GCS bucket, e.g. `cgu-storage`.
2. Create a service account, grant it **Storage Object Admin** on that bucket,
   and download a JSON key.
3. Put the key on the VM, readable only by the app user:

```bash
sudo mkdir -p /etc/cgu
sudo cp gcs-service-account.json /etc/cgu/
sudo chown root:cgu /etc/cgu/gcs-service-account.json
sudo chmod 640 /etc/cgu/gcs-service-account.json
```

4. Set these env vars (see `.env.example`):

```
OBJECT_STORAGE_PROVIDER=gcs
GCS_SERVICE_ACCOUNT_KEY_FILE=/etc/cgu/gcs-service-account.json
PRIVATE_OBJECT_DIR=/cgu-storage/private
PUBLIC_OBJECT_SEARCH_PATHS=/cgu-storage/public
```

Uploads use presigned URLs, so the bucket needs CORS for browser PUTs:

```bash
cat > cors.json <<'EOF'
[{"origin": ["https://your-domain.example.com"],
  "method": ["GET", "PUT", "HEAD"],
  "responseHeader": ["Content-Type"],
  "maxAgeSeconds": 3600}]
EOF
gcloud storage buckets update gs://cgu-storage --cors-file=cors.json
```

## 4. Build the app

```bash
sudo -u cgu -H bash
cd /opt/cgu
git clone <your-repo-url> app && cd app
pnpm install --frozen-lockfile

# API server
pnpm --filter @workspace/api-server run build     # -> artifacts/api-server/dist

# Portal (BASE_PATH and VITE_* vars are baked in at build time)
export BASE_PATH=/
export VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
pnpm --filter @workspace/portal run build         # -> artifacts/portal/dist/public
```

## 5. Environment variables

Copy `.env.example` to `/etc/cgu/cgu.env`, fill in real values, and lock it
down (`chmod 640`, `chown root:cgu`). Key points:

- `PUBLIC_BASE_URL=https://your-domain.example.com` — the public origin. Used
  for Bank of Georgia payment callbacks and absolute links in emails. Must be
  the HTTPS domain nginx serves.
- `OBJECT_STORAGE_PROVIDER=gcs` plus the GCS vars from step 3.
- `DATABASE_URL` from step 2.
- Clerk, email, and Bank of Georgia credentials as documented in
  `.env.example`.

## 6. systemd service for the API server

`/etc/systemd/system/cgu-api.service`:

```ini
[Unit]
Description=CGU API server
After=network.target postgresql.service

[Service]
Type=simple
User=cgu
WorkingDirectory=/opt/cgu/app/artifacts/api-server
EnvironmentFile=/etc/cgu/cgu.env
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node --enable-source-maps ./dist/index.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cgu-api
sudo journalctl -u cgu-api -f     # watch logs
```

(If you prefer pm2: `pm2 start dist/index.mjs --name cgu-api` with the same
env file loaded, then `pm2 save && pm2 startup`.)

## 7. nginx + HTTPS

`/etc/nginx/sites-available/cgu`:

```nginx
server {
    server_name your-domain.example.com;
    listen 80;

    # Portal (static SPA)
    root /opt/cgu/app/artifacts/portal/dist/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 50m;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cgu /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS via Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example.com
```

The API server sets `trust proxy`, so the `X-Forwarded-*` headers above are
required for correct client IPs and protocol detection.

## 8. Verify

```bash
curl -sS https://your-domain.example.com/api/health || \
curl -sS -o /dev/null -w '%{http_code}\n' https://your-domain.example.com/api/courses
```

Then open the site in a browser: sign-in (Clerk), a file upload, and a test
payment are the three flows that exercise every external dependency.

## 9. Updating

```bash
cd /opt/cgu/app
git pull
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push          # if schema changed
pnpm --filter @workspace/api-server run build
BASE_PATH=/ VITE_CLERK_PUBLISHABLE_KEY=pk_live_... \
  pnpm --filter @workspace/portal run build
sudo systemctl restart cgu-api
```

## Replit vs self-hosted behavior

| Concern | On Replit | Self-hosted |
|---|---|---|
| File storage | `OBJECT_STORAGE_PROVIDER` unset/`replit` → Replit App Storage sidecar | `OBJECT_STORAGE_PROVIDER=gcs` + service-account key |
| Public URL | Derived from Replit domains / request | `PUBLIC_BASE_URL` env var |
| Database | Replit-provisioned `DATABASE_URL` | Your own `DATABASE_URL` |
| Process manager | Replit workflows/deployments | systemd (or pm2) + nginx |
