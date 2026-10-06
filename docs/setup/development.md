# Development Setup Guide

## Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

---

## 1. Installation

From the root directory:
```bash
# Install root, client, and server dependencies
npm run install:all
```
Or individually:
```bash
# Server
cd server && npm install

# Client
cd client && npm install
```

---

## 2. Environment Variables
Copy `.env.example` in `server/`:
```bash
# Optional: Provide Gemini API key for live LLM responses
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
```
*Note: If `GEMINI_API_KEY` is not provided, the application automatically uses the built-in deterministic grounded fallback engine.*

---

## 3. Running Locally
Run both client and server from the root:
```bash
npm run dev
```
Or run in separate terminal tabs:
```bash
# Terminal 1: Backend API (port 5000)
npm run dev:server

# Terminal 2: Frontend Vite App (port 5173)
npm run dev:client
```

---

## 4. Running Verification Test Suites
Run the phase verification suites using Node:
```bash
# Run Phase 12 Food Explorer Verification
node tests/phase/phase-12/test-phase12-all.mjs

# Run Deep Location & Filter Audit
node tests/phase/phase-12/verify-phase12-deep.mjs
```

---

## 5. Production Builds
```bash
# Build frontend
cd client && npm run build

# Build backend
cd server && npm run build
```
