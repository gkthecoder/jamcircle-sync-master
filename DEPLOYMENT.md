
# Jam Circle — Deployment & Spotify API Setup Guide

## Overview

Jam Circle is a client-side React app (Vite + TypeScript) that uses:

- **Spotify Web API** via PKCE OAuth (no backend needed for auth)
- **Anthropic Claude API** for intelligent setlist generation
- **Vercel** for hosting (recommended)

-----

## Step 1: Spotify Developer Setup

### 1.1 Create a Spotify App

1. Go to https://developer.spotify.com/dashboard
1. Log in with your Spotify account
1. Click **“Create app”**
1. Fill in:
- **App name**: Jam Circle
- **App description**: Converts Spotify playlists into band setlists
- **Website**: Your production URL (or leave blank)
- **Redirect URI**: Add BOTH:
  - `http://localhost:5173` (for local development)
  - `https://your-app.vercel.app` (your production URL — add after deploying)
- **Which API/SDKs**: check **Web API**
1. Click **Save**

### 1.2 Get Your Credentials

After creating the app:

- Copy the **Client ID** (shown on the dashboard)
- You do NOT need the Client Secret — Jam Circle uses the PKCE flow

### 1.3 Spotify API Scopes Used

|Scope                        |Purpose                        |
|-----------------------------|-------------------------------|
|`playlist-read-private`      |Access user’s private playlists|
|`playlist-read-collaborative`|Access collaborative playlists |
|`user-library-read`          |Access saved tracks            |
|`user-read-private`          |Get user profile info          |
|`user-read-email`            |Get user email                 |

### 1.4 Spotify App Quota & Limits

**Development Mode (default):**

- Up to 25 users can authenticate (add them manually in Dashboard → Users and Access)
- All Spotify API endpoints available
- Perfect for personal/band use

**Extended Quota (for public release):**

- Submit a quota extension request from your Spotify Dashboard
- Requires describing your app’s use case
- Takes 2–6 weeks for approval

-----

## Step 2: Anthropic API Setup

1. Go to https://console.anthropic.com/settings/api-keys
1. Create a new API key named “Jam Circle”
1. Copy the key — you’ll need it for environment variables

### ⚠️ API Key Security Note

The Anthropic API key is referenced as `VITE_ANTHROPIC_API_KEY` which means it’s
**bundled into the client-side JavaScript**. This is acceptable for:

- Personal/internal band tools
- Prototypes and demos
- Low-traffic apps where you trust your users

**For a public-facing production app**, use one of these approaches:

- **Option A**: Create a simple proxy (Vercel Edge Function) that adds the API key server-side
- **Option B**: Use Anthropic’s user-based auth features
- **Option C**: Rate-limit by Spotify user ID on a lightweight backend

See the `backend-proxy/` section at the bottom of this guide for Option A implementation.

-----

## Step 3: Local Development

```bash
# 1. Clone the repo
git clone https://github.com/gkthecoder/jamcircle-sync-master.git
cd jamcircle-sync-master

# 2. Install dependencies
npm install
# or if using bun:
bun install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Spotify Client ID and Anthropic API key

# 4. Start dev server
npm run dev
# App runs at http://localhost:5173
```

### Integration Checklist for Local Dev

- [ ] `VITE_SPOTIFY_CLIENT_ID` set in `.env.local`
- [ ] `VITE_REDIRECT_URI=http://localhost:5173` in `.env.local`
- [ ] `VITE_ANTHROPIC_API_KEY` set in `.env.local`
- [ ] `http://localhost:5173` added to Spotify Dashboard redirect URIs
- [ ] Your Spotify account added to app’s user allowlist (Dashboard → Users and Access)

-----

## Step 4: Deploy to Vercel (Recommended)

### 4.1 One-Click Deploy

1. Push your code to GitHub (already done)
1. Go to https://vercel.com/new
1. Import your `jamcircle-sync-master` repository
1. In the **Environment Variables** section, add:

|Variable                |Value                        |
|------------------------|-----------------------------|
|`VITE_SPOTIFY_CLIENT_ID`|Your Spotify Client ID       |
|`VITE_REDIRECT_URI`     |`https://your-app.vercel.app`|
|`VITE_ANTHROPIC_API_KEY`|Your Anthropic API key       |

1. Click **Deploy**
1. Note your deployment URL (e.g. `https://jamcircle-sync-master.vercel.app`)

### 4.2 Update Spotify Dashboard

After deploying:

1. Go back to https://developer.spotify.com/dashboard
1. Open your app → Edit settings
1. Add your Vercel URL to **Redirect URIs**:
   `https://jamcircle-sync-master.vercel.app`
1. Save

### 4.3 Custom Domain (Optional)

In Vercel:

1. Go to your project → Settings → Domains
1. Add your custom domain
1. Update your Spotify redirect URI and `VITE_REDIRECT_URI` to match

-----

## Step 5: Deploy to Netlify (Alternative)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

Add the same environment variables in Netlify → Site settings → Environment variables.

Create a `netlify.toml` for SPA routing:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

-----

## Step 6: Vercel Edge Function Proxy (Secure API Key)

For production apps with public users, create `api/claude.ts` in your project:

```typescript
// api/claude.ts — Vercel Edge Function
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!, // server-side only
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(req.body),
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
```

Then in `src/lib/setlist.ts`, change the fetch URL from:

```
https://api.anthropic.com/v1/messages
```

to:

```
/api/claude
```

And add `ANTHROPIC_API_KEY` (without `VITE_` prefix) to your Vercel env vars
— this way it’s never exposed to the browser.

-----

## Architecture Summary

```
User Browser
    │
    ├─► Spotify Auth (PKCE OAuth — no backend)
    │       └─► Spotify Web API (playlists, tracks, audio features)
    │
    └─► Claude API (setlist generation)
            └─► [Optional] Vercel Edge Proxy (hides API key)

Storage: localStorage (tokens + saved setlists)
Hosting: Vercel (static site + optional edge functions)
```

-----

## Troubleshooting

|Issue                        |Fix                                                    |
|-----------------------------|-------------------------------------------------------|
|“INVALID_CLIENT” from Spotify|Check Client ID + Redirect URI match exactly           |
|Redirect loops on login      |Clear localStorage and sessionStorage                  |
|401 from Spotify API         |Token expired — logout and reconnect                   |
|403 from Spotify API         |User not in allowlist (dev mode)                       |
|Claude API 401               |Check `VITE_ANTHROPIC_API_KEY` is set                  |
|Blank page on Netlify/Vercel |Add SPA redirect rule (all routes → index.html)        |
|Audio features missing       |Spotify occasionally throttles; setlist still generates|

-----

## Files to Integrate Into Your Project

Copy these into your existing Lovable project:

```
src/
  lib/
    spotify.ts       ← Spotify OAuth + API client
    setlist.ts       ← Claude setlist generation + export
  hooks/
    useSpotifyAuth.ts ← Auth state hook
  pages/
    Index.tsx        ← Full UI (replace existing)
.env.example         ← Environment variable template
```

Then update `src/App.tsx` to import `Index` from `@/pages/Index` as your root route.
