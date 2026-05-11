# 🥗 NutriLens — AI Food Scanner

An AI-powered web app to scan food for calories and find recipes from your ingredients, powered by **Groq** (meta-llama/llama-4-scout-17b-16e-instruct vision model).

## Features

- **🔥 Calorie Scan** — Upload a photo of any meal to get instant calorie counts, macro breakdown (protein/carbs/fat/fiber), a health score, and nutrition tips
- **🥘 Recipe Finder** — Upload a photo of your fridge, pantry, or laid-out ingredients and get 3 recipe suggestions with step-by-step instructions
- **📊 Daily Log** — Track your calorie intake against a 2,000 kcal daily goal with a live arc chart

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get a Groq API key

Sign up for free at [console.groq.com](https://console.groq.com) and create an API key (starts with `gsk_`).

### 3. Run the app

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

On first launch you'll be prompted to enter your Groq API key. It's stored in localStorage and only ever sent to the Groq API.

## Build for production

```bash
npm run build
npm run preview
```

## Tech Stack

- React 18 + Vite
- Groq API — meta-llama/llama-4-scout-17b-16e-instruct (vision)
- Pure CSS (no UI library) with Google Fonts

## Notes

- The app calls the Groq API directly from the browser — fine for personal use
- For a production deployment, route API calls through your own backend to keep your key secret
- Daily calorie log resets on page refresh (no persistence by default)
- Groq offers a generous free tier with very fast inference
