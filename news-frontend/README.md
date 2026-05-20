<!-- # React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project. -->

# 📰 NewsDigest

Live AI-summarised news digest from BBC, CNN, and BBC Tech.

## Features
- Fetches news from 3 RSS sources every 30 minutes
- AI summaries via Groq LLaMA 3.3
- Topic clustering (Politics, Tech, Sports, Business, Health)
- Sentiment tagging per article
- REST API with rate limiting
- Auto-generated Swagger docs

## Setup

pip install -r requirements.txt

Add your Groq API key in main.py:
GROQ_API_KEY = "your_key_here"

Run backend:
uvicorn main:app --reload

Run frontend:
cd news-frontend
npm run dev

## API Endpoints

| Endpoint | Description |
|---|---|
| GET /status | Health check (no auth) |
| GET /digest | All clustered news |
| GET /topic/{name} | Filter by topic |
| GET /sources | Active sources |

## API Docs
http://localhost:8000/docs

## Demo API Key
newsdigest-demo-key-123