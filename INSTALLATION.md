# Installation & Startup Guide

## Prerequisites

- **Node.js**: v20 or v22+ (v22.23+ recommended for native `node:sqlite`)
- **NPM**: v9 or v10+
- **Copado Agentia CLI** (optional, for live production integration)

## Copado Agentia CLI Setup (Optional)

ReleaseSentry AI can operate in two modes:
- **DEMO MODE**: High-fidelity simulated release sandbox (default, no setup required)
- **LIVE MODE**: Connected to real Copado environment (requires Agentia CLI)

### 1. Sign in with Copado

New to Copado? Headless needs a Copado account. [Start a free Agentia trial](https://app.copado.com/trial?utm_source=developer.copado.com&utm_medium=referral&utm_campaign=headless&utm_content=install_note), then come back and install the CLI.

### 2. Install the CLI

```bash
npm install -g @copado/agentia-cli
```

This makes the `agentia` binary available system-wide.

### 3. Run the Setup Wizard

```bash
agentia setup
```

The wizard guides you through authentication, skills configuration, local quality gates and more.

### 4. IDE Extensions (Optional)

Companion IDE extensions are available:
- [Install for VS Code](https://marketplace.visualstudio.com/items?itemName=Copado.agentia-idex)
- [Install for Cursor](https://open-vsx.org/extension/copado/agentia-idex)

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
# Optional: FEATHERLESS_API_KEY enables the Featherless AI-powered Release Analyst.
# If omitted, ReleaseSentry AI uses its built-in deterministic evidence-grounded explanation engine.
FEATHERLESS_API_KEY="your-featherless-api-key"

# Port defaults to 3000
PORT=3000

# Optional: Force Demo mode even if Copado Agentia CLI is locally installed
# Set to 'false' to use live Agentia CLI integration
AGENTIA_FORCE_DEMO=true
```
