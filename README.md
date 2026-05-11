# 🥗 NutriLens — AI Food Scanner (Cloudflare Pages)

Powered by Groq vision AI, deployed on Cloudflare Pages with a Pages Function proxy so your API key stays server-side.

## Project structure

```
nutrilens/
├── functions/
│   └── api/
│       └── analyze.js   ← Cloudflare Pages Function (server-side Groq proxy)
├── src/
│   ├── main.jsx
│   └── App.jsx          ← React frontend (no API key in browser)
├── index.html
├── package.json
└── vite.config.js
```

## Deploy to Cloudflare Pages

### 1. Push to GitHub

```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOU/nutrilens.git
git push -u origin main
```

### 2. Connect in Cloudflare Dashboard

- Go to **Pages → Create a project → Connect to Git**
- Select your repo
- Build settings:
  - **Framework preset**: Vite
  - **Build command**: `npm run build`
  - **Build output directory**: `dist`

### 3. Add your Groq API key

- Pages → Your project → **Settings → Environment variables**
- Add: `GROQ_API_KEY` = `gsk_...` (get one free at console.groq.com)
- Set for both **Production** and **Preview**

### 4. Deploy

Cloudflare will build and deploy. The `functions/api/analyze.js` file is automatically picked up as a serverless function at `/api/analyze`.

## Local dev

```bash
npm install
npx wrangler pages dev dist --compatibility-date=2024-01-01
```

Or with Vite only (functions won't run locally without wrangler):

```bash
npm run dev
```

## How it works

The browser sends `{ imageDataURL, mode }` to `/api/analyze`. The Cloudflare Function adds the `GROQ_API_KEY` header server-side and forwards to Groq — so the key is never exposed to users.
