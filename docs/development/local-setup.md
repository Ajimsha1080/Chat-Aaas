# Local Development Setup Guide

## Prerequisites
- **Node.js**: v20.x or later (v25 supported)
- **Python**: 3.10, 3.11, or 3.12
- **Git**

---

## 1. Repository Setup
`ash
git clone https://github.com/Ajimsha1080/Chat-Aaas.git
cd Chat-Aaas
npm install
`

---

## 2. Environment Configuration
Copy the example environment file:
`ash
cp .env.example .env
`

---

## 3. Running Services

### Start the Python AI Microservice (FastAPI):
`ash
python -m uvicorn backend_python.app.main:app --host 127.0.0.1 --port 8000 --reload
`

### Start the Frontend & Node.js Server:
`ash
npm run dev
`

---

## 4. Running Automated Tests
`ash
# Run all TypeScript + Python test suites
npm run test:all

# Run TypeScript tests only (15 suites)
npm test

# Run Python AI tests only (10 suites)
npm run test:python
`\n