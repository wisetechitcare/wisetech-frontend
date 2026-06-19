# LAN Network Access — How It Works & Why

This document explains the full setup that allows the WiseTech frontend and backend to be accessed from **any PC on the same Wi-Fi / LAN network**, and why it does not break local development or production.

---

## The Problem We Solved

Originally, `.env` had:

```env
VITE_APP_WISE_TECH_BACKEND=http://localhost:9000
```

This worked fine on the **developer's own machine** because `localhost` resolves to that machine itself.

But when another PC on the same network opened the app, the browser on **that PC** read the JavaScript bundle and tried to call `http://localhost:9000` — which means **that PC's own localhost**. Nothing is running there, so every API call failed.

---

## The Solution — Vite Proxy

Instead of hardcoding any IP address, we use **Vite's built-in proxy**.

### How the proxy works

The frontend no longer calls the backend by IP. Instead it makes **relative requests** (no host, no IP):

```
/api/auth/login
/api/employee/list
/socket.io/
/uploads/some-file.jpg
```

Vite's dev server (running on the host machine) intercepts these paths and **forwards them to the backend on the same machine**:

```
Browser (any PC)  →  http://192.168.1.44:5173/api/auth/login
                              ↓  Vite proxy (on host machine)
                       http://localhost:9000/api/auth/login  ✓
```

Because Vite is always running on the host machine, `localhost:9000` always means the backend on that same machine — regardless of which PC opened the browser.

---

## What Changed

### 1. `vite.config.ts` — Proxy + LAN binding

```ts
server: {
  host: '0.0.0.0',   // bind to all network interfaces, not just localhost
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:9000',
      changeOrigin: true,
    },
    '/socket.io': {
      target: 'http://localhost:9000',
      changeOrigin: true,
      ws: true,           // proxy WebSocket connections too
    },
    '/uploads': {
      target: 'http://localhost:9000',
      changeOrigin: true,
    },
  },
},
```

- `host: '0.0.0.0'` — Vite listens on all network interfaces so other PCs can reach it.
- `proxy` — All `/api`, `/socket.io`, and `/uploads` requests are forwarded to the backend.
- `ws: true` on `/socket.io` — real-time Socket.IO connections are also proxied.

### 2. `.env` — `VITE_APP_WISE_TECH_BACKEND` set to empty

```env
VITE_APP_WISE_TECH_BACKEND=
```

**Why empty?**

When this variable is empty, every service file builds a relative URL:

```ts
const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND; // ""
const endpoint = `${API_BASE_URL}/api/auth/login`;               // "/api/auth/login"
```

`/api/auth/login` is a relative path — the browser sends it to **whatever host it loaded the page from** (e.g. `192.168.1.44:5173`). Vite catches it and proxies it to `localhost:9000`.

If it were still `http://localhost:9000`, the browser would send requests directly to localhost — which fails on any machine other than the developer's own.

---

## Does This Break Anything?

### Local development (your own machine) — NO

When you open `http://localhost:5173` on your own machine:

1. Browser loads the page from `localhost:5173`
2. API calls go to `localhost:5173/api/...`
3. Vite proxies them to `localhost:9000`
4. Backend responds

Identical behaviour to before — just one extra hop through the proxy.

### Other PCs on the same network — NOW WORKS

When another PC opens `http://192.168.1.44:5173`:

1. Browser loads the page from `192.168.1.44:5173`
2. API calls go to `192.168.1.44:5173/api/...`
3. Vite (running on the host machine at `192.168.1.44`) proxies them to `localhost:9000`
4. Backend responds

No IP hardcoded anywhere. Works automatically.

### Production — NO EFFECT

The Vite proxy **only runs during `vite dev`**. It does not exist in production builds.

When you run `vite build`:
- The proxy config is completely ignored
- The built JS bundle uses `VITE_APP_WISE_TECH_BACKEND` — which is empty
- In production, your hosting (AWS Amplify, Nginx, etc.) handles routing `/api` to the backend
- Nothing about this setup touches the production environment

---

## How to Run

### Prerequisites
- Node.js 18+
- Backend running (`npm run start:dev` in `wisetech-backend`)
- Both machines on the same Wi-Fi / LAN

### Start the frontend

```bash
cd wisetech-frontend
npm install       # first time only
npm run dev
```

Vite will print:

```
  VITE ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.44:5173/   ← share this with other PCs
```

### Access from another PC

Open the **Network** URL shown above in any browser on any PC connected to the same network.

No configuration needed on the other PC.

---

## Finding Your LAN IP (if needed)

Run on the **host machine** (the one running the servers):

| OS      | Command     | Look for                          |
|---------|-------------|-----------------------------------|
| Windows | `ipconfig`  | IPv4 Address under "Wi-Fi"        |
| macOS   | `ifconfig`  | `inet` under `en0`                |
| Linux   | `hostname -I` | First IP listed                 |

Example: `192.168.1.44`

---

## Windows Firewall (if another PC can't connect)

If the other PC can't reach the frontend, port 5173 may be blocked.

Run in **PowerShell as Administrator** on the host machine:

```powershell
New-NetFirewallRule -DisplayName "WiseTech Frontend (Dev)" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private
```

To remove later:

```powershell
Remove-NetFirewallRule -DisplayName "WiseTech Frontend (Dev)"
```

> Port 9000 (backend) does NOT need to be open in the firewall — other PCs never connect to it directly. All traffic goes through Vite on port 5173.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| API calls fail on other PC | `VITE_APP_WISE_TECH_BACKEND` not empty | Set it to empty in `.env`, restart Vite |
| "This site can't be reached" on port 5173 | Firewall blocking port 5173 | Run the PowerShell firewall command above |
| Login works but data doesn't load | Backend not running | Start backend with `npm run start:dev` |
| Socket / real-time not working | WebSocket proxy not applied | Ensure `ws: true` is on `/socket.io` proxy in `vite.config.ts` |
| Changes to `.env` not taking effect | Vite not restarted | `Ctrl+C` then `npm run dev` again |

---

## Summary

| What | Before | After |
|---|---|---|
| `VITE_APP_WISE_TECH_BACKEND` | `http://localhost:9000` | *(empty)* |
| Frontend binding | `localhost` only | `0.0.0.0` (all interfaces) |
| Backend URL in browser JS | Hardcoded `localhost:9000` | Relative `/api` path |
| API routing | Browser → Backend directly | Browser → Vite proxy → Backend |
| Works on other PCs | No | Yes |
| Localhost still works | Yes | Yes |
| Production affected | — | No |
