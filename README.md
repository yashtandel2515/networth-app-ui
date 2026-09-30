# Wealthy · Net Worth — Claude Artifact Replica

This repository packages the **uploaded original React source** into a runnable Vite + Tailwind app. Layout and interactions follow the source as provided.

## Start locally (macOS / Windows / Linux)

Install Node.js 20.19+ or Node.js 22.12+, then run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

To make a production build:

```bash
npm run build
npm run preview
```

## Demo controls

- **Mock 1** starts with a fresh client and lets you simulate onboarding.
- **Mock 2** loads the populated Priya Mehta portfolio with sample accounts, assets, liabilities, events, and snapshots.
- Toggle **Simulate one institution failing**, **RM/business signals**, or **State inspector**.
- The prototype fixes the demo clock at **4 September 2026**, intentionally matching the original artifact.

## Data and integration scope

All account, FIP, broker, valuation, customer, and transaction values supplied in `src/App.jsx` are **sample/demo data**. The AA, EPF, broker, vehicle and refresh flows are local simulations; no live external financial service is connected, no real account is synced, and no credentials should be entered. State is held in React memory and resets on page reload. To make it production-ready, connect authenticated backend APIs and implement actual consent/security/data handling separately.

## Source

`src/App.jsx` is the original supplied artifact code. Other files are the minimal Vite/Tailwind project wrapper.
