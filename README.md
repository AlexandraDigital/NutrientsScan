# 🥗 NutriLens — AI Food Scanner

An AI-powered web app to scan food for calories and find recipes from your ingredients, using Claude's vision AI.

## Features

- **🔥 Calorie Scan** — Upload a photo of any meal to get instant calorie counts, macro breakdown (protein/carbs/fat/fiber), a health score, and nutrition tips
- **🥘 Recipe Finder** — Upload a photo of your fridge, pantry, or laid-out ingredients and get 3 recipe suggestions with step-by-step instructions
- **📊 Daily Log** — Track your calorie intake against a 2,000 kcal daily goal with a live arc chart

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get an Anthropic API key

Sign up at [console.anthropic.com](https://console.anthropic.com) and create an API key.

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

On first launch, you'll be prompted to enter your Anthropic API key. It's stored in `localStorage` and only sent to the Anthropic API — never anywhere else.

## Build for production

```bash
npm run build
npm run preview
```

## Tech Stack

- **React 18** + **Vite**
- **Anthropic Claude claude-sonnet-4-20250514** with vision (image analysis)
- Pure CSS (no UI library) with Google Fonts

## Notes

- The app calls the Anthropic API directly from the browser using the `anthropic-dangerous-direct-browser-access` header (fine for personal use)
- For a production deployment, route API calls through your own backend to keep your API key secret
- Daily calorie log resets on page refresh (no persistence by default)
