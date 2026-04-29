# Build and Deploy

This document describes the current build and deployment flow for this repository.

The active code lives in:

- `public/` for the public site, admin UI, shared assets, and static HTML pages
- `public/server/` for the Node.js API, SQLite-backed storage layer, upload pipeline, and deployment build script

Legacy backend snapshots are not part of the active deployment flow.

## Overview

This project is deployed as a single Node.js site.

Use this when you want:

- one Node.js app to serve everything
- the same process to serve HTML, assets, `/api/*`, and `/media/*`

Build output:

- `public/server/dist`

## Prerequisites

Local build machine:

- Windows with PowerShell
- Node.js 20 or 22
- npm

Remote server:

- Linux host
- Node.js 20 or 22
- npm
- a process manager such as PM2 for production

## Local Development

Install backend dependencies:

```powershell
cd public\server
npm ci
```

Run the backend locally:

```powershell
npm run dev
```

Or from the repo root:

```powershell
.\run.bat
```

By default the local server starts from:

- [public/server/src/server.js](/e:/Sync/Companies/Toji%20Studios/Website/V1/public/server/src/server.js)

Default port:

- `5179`

Health check:

```text
http://localhost:5179/api/health
```

Expected response:

```json
{"ok":true}
```

## Build Commands

From the repo root:

```powershell
.\deploy.bat
```

This runs `npm run deploy:build` inside `public/server`.

You can also run it directly:

```powershell
cd public\server
npm run deploy:build
```

## What The Build Script Does

The build script is:

- [public/server/scripts/build-deploy-dist.ps1](/e:/Sync/Companies/Toji%20Studios/Website/V1/public/server/scripts/build-deploy-dist.ps1)

It:

- deletes and recreates `public/server/dist`
- copies backend runtime files into `dist`
- copies the public site into `dist/site`
- minifies JavaScript files in all generated bundles using `esbuild`

Because the script recreates `public/server/dist`, that folder is always safe to delete locally and rebuild.

## Output Folders

- `public/server/dist`
  - backend runtime files at the bundle root
  - public site files in `dist/site`

The server auto-detects the embedded `site` folder in this layout.

## Environment Variables

The backend reads configuration from `.env` at runtime.

Common variables used by the current server include:

- `PORT`
- `ADMIN_TOKEN`
- `CORS_ORIGIN`
- `TOJI_STORAGE_DIR`
- `TOJI_SITE_DIR`
- `PUBLIC_SITE_VERSION`
- optional OpenAI-related variables if AI features are enabled

Important notes:

- `ADMIN_TOKEN` is required for admin API access
- `TOJI_STORAGE_DIR` controls where the SQLite database and image storage live
- if `TOJI_SITE_DIR` is not set, the server tries to auto-detect the site root
- do not ship your local development `.env` file to production without reviewing and rotating secrets

The storage layout is driven by:

- [public/server/src/db.js](/e:/Sync/Companies/Toji%20Studios/Website/V1/public/server/src/db.js)

Production storage should live outside the deployment bundle, for example:

```text
/home/<site-user>/app-data/storage
```

## Deploy

### Upload

Upload only:

- `public/server/dist`

Example target directory:

```text
/home/<site-user>/htdocs/<your-domain>
```

### Install Dependencies On Linux

```bash
cd /home/<site-user>/htdocs/<your-domain>
npm ci --omit=dev
```

### Example Production `.env`

```dotenv
PORT=5179
ADMIN_TOKEN=replace-with-a-long-random-secret
CORS_ORIGIN=https://www.example.com
TOJI_STORAGE_DIR=/home/<site-user>/app-data/storage
```

`TOJI_SITE_DIR` is optional in this mode because the server will detect `./site` automatically.

### Start The App

```bash
cd /home/<site-user>/htdocs/<your-domain>
npm install -g pm2
pm2 start npm --name toji-site -- start
pm2 save
```

In this topology the Node app serves:

- static frontend pages
- admin pages
- `/api/*`
- `/media/*`

## CloudPanel Setup

Use a single CloudPanel Node.js site for this project.

### Create The Site

In CloudPanel:

1. Create a new `Node.js` site for your domain.
2. Use the CloudPanel site directory under `htdocs`, for example `/home/<site-user>/htdocs/<your-domain>`.
3. Set the app port to `5179`.
4. Use Node.js `20` or `22`.

### Upload The Build

Build locally:

```powershell
.\deploy.bat
```

Upload the contents of `public/server/dist` into the CloudPanel app directory so it contains:

- `package.json`
- `package-lock.json`
- `src/`
- `site/`

### Create The Production Env File

Inside the app directory, create `.env` with your production values:

```dotenv
PORT=5179
ADMIN_TOKEN=replace-with-a-long-random-secret
CORS_ORIGIN=https://www.example.com
TOJI_STORAGE_DIR=/home/<site-user>/app-data/storage
```

`TOJI_SITE_DIR` is optional in CloudPanel for this layout because the server auto-detects `./site`.

### Install Dependencies And Start

SSH into the CloudPanel site user, 

```bash
ssh toji@172.218.5.118 password
```

Once connected successfully, stop the server:

```bash
pm2 stop toji-server
```


then run:

```bash
cd /home/<site-user>/htdocs/<your-domain>
npm ci --omit=dev
pm2 start npm --name toji-site -- start
pm2 save
```

### Point CloudPanel At The Running App

In CloudPanel site settings:

1. Set the app port to `5179`.
2. Ensure the domain points to this Node.js site.
3. Restart the app after uploads or environment changes.

### Reboot Persistence

If PM2 is not already configured to restore on reboot for that server, run:

```bash
pm2 startup
pm2 save
```

Then execute the command that `pm2 startup` prints for your server.

### CloudPanel Checks

After setup, verify:

- `https://your-domain.example/api/health`
- the home page loads from the Node.js site
- `/media/...` assets load
- `/admin/login.html` loads
- admin pages like `/admin/LinkManager` and `/admin/SocialMediaManager` load

## Current Server Behavior

The live server entry is:

- [public/server/src/server.js](/e:/Sync/Companies/Toji%20Studios/Website/V1/public/server/src/server.js)

Current behavior includes:

- `/api/health` returns `{"ok": true}`
- `/media/*` serves generated image variants
- static assets are served from the resolved site root
- legacy admin URLs like `/admin/LinkManager` and `/admin/SocialMediaManager` are resolved to their matching HTML files

## Validation Checklist

After deployment, verify:

1. `/api/health` responds successfully.
2. Public pages load without broken API calls.
3. `/media/...` URLs return images.
4. Admin login works with the production `ADMIN_TOKEN`.
5. Admin pages load, including `LinkManager` and `SocialMediaManager`.
6. Uploading artwork writes to the configured storage directory.
7. Restarting the process manager brings the app back cleanly.

## Updating Later

For future updates:

1. Build a fresh bundle locally.

```powershell
.\deploy.bat
```

2. Upload only the generated bundle for your chosen topology from the 'dist' folder:

```bash
package.json
package-lock.json
.env (if updated)
src folder
site folder
```

3. On the server, reinstall dependencies if `package-lock.json` changed.

```bash
npm ci --omit=dev
```

4. Restart the app.

```bash
pm2 restart toji-server

or

pm2 stop toji-server
pm2 start toji-server

```

## Backups

Back up at minimum:

- `toji.sqlite`
- `originals/`
- `variants/`
- the production `.env`

These should be backed up from the production storage location, not from a temporary deployment bundle.
