# Installation & Startup Guide

## Prerequisites

- **Node.js**: v20 or v22+ (v22.23+ recommended for native `node:sqlite`)
- **NPM**: v9 or v10+

---

## Windows PowerShell Commands

To clone, install, test, and start ReleaseSentry AI on Windows PowerShell:

```powershell
# 1. Install dependencies
npm install

# 2. Run automated test suite (Vitest)
npm test

# 3. Test the Headless CLI
npm run releasesentry -- doctor
npm run releasesentry -- skills list
npm run releasesentry -- inspect RLS-104

# 4. Start the Full-Stack Application (Express + Vite Dev Server on Port 3000)
npm run dev
```

Navigate your browser to:
`http://localhost:3000`

---

## Linux / macOS Bash Commands

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Check system diagnostics
npm run releasesentry -- doctor

# 4. Launch web application
npm run dev
```

---

## Environment Variables (Optional)

In `.env`:
```ini
# Optional: GEMINI_API_KEY enables the Gemini-powered AI Release Analyst.
# If omitted, ReleaseSentry AI uses its built-in deterministic evidence-grounded explanation engine.
GEMINI_API_KEY="your-gemini-api-key"

# Port defaults to 3000
PORT=3000

# Optional: Force Demo mode even if Copado Agentia CLI is locally installed
AGENTIA_FORCE_DEMO=true
```
