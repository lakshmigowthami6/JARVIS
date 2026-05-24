# JARVIS

JARVIS is an AI agent chat interface built with React, TypeScript, Vite, Gemini 2.5 Flash, and LangChain.

The app has a cinematic animated background, a minimal chat UI, and a Node.js LangChain agent server that knows its name is JARVIS and can call tools.

## Features

- React + TypeScript frontend
- Gemini 2.5 Flash model
- LangChain agent backend
- Tool calling support
- Animated J.A.R.V.I.S wallpaper background
- Local Vite proxy from `/api` to the agent server

## Agent Tools

The LangChain agent currently has:

- `calculator` - solves math expressions
- `current_time` - returns the current date/time for a timezone
- `wikipedia_lookup` - gets concise Wikipedia summaries

## Setup

Install dependencies:

```powershell
npm install
```

Create a `.env` file in the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
AGENT_PORT=8787
```

Run the app:

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Scripts

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```

## Project Structure

```text
src/                  React app
server/agent-server.js LangChain agent API server
public/assets/        Wallpaper and static assets
```

## Security

Do not commit `.env`. It is ignored by Git. For production, use a backend-only API key setup and restrict the key in Google AI Studio.
