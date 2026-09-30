# Northstar

Northstar is a calm, ad-free thinking companion for students and young adults. It helps people reflect, clarify what matters, and choose their own next step.

## Run locally

1. Install Node.js 20.19 or newer.
2. Run `npm install` and `npm run dev` to start the Vite interface.
3. Copy `.env.example` to `.env.local` and add a Groq API key for hosted AI conversations.

The Groq API key is read only by the serverless function in `/api/chat` and is never sent to browser code. The app requires no account or database. Chat messages are sent to Groq for response generation; conversation history, mood notes, goals, and decision drafts are saved in the current browser's local storage. They do not sync between devices.

The app includes a local chat history, guided reflection, a decision workspace with an AI-generated pros/cons and risks dashboard, a mood journal, goals, daily exercises, progress overview, optional browser voice dictation and spoken replies, and English, Hindi, and Spanish response preferences.

## Deploy to Vercel

Import this repository as a Vite project. Use `npm run build` as the build command and `dist` as the output directory. Add `GROQ_API_KEY` to the Vercel environment variables. The `/api/chat` serverless function calls Groq using the key stored in the server environment.
