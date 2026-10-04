# Mnemo — frontend

Web app for [Mnemo](https://huggingface.co/spaces/prajwalpujari16/mnemo-backend): upload documents and chat
with them. Answers say where they came from (your documents, the web, general knowledge, or memory) and cite
their sources with page numbers.

Built with Next.js (App Router, static export), TypeScript and Tailwind CSS. The site is plain static files;
the browser talks to the backend directly, so slow answers and large uploads never hit hosting time limits.

## Pages

| Route | What it does |
|---|---|
| `/login`, `/signup` | Account access |
| `/chat` | Conversations, document/topic scope, tone, citations, 👍/👎 feedback |
| `/documents` | Drag-and-drop upload with progress, documents grouped by topic, delete |
| `/analytics` | Usage and feedback summary |
| `/settings` | Change password, tips |

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
```

The backend URL comes from `NEXT_PUBLIC_API_BASE` (see `.env.example`); it defaults to the Hugging Face Space.
To use a local backend, create `.env.local` with `NEXT_PUBLIC_API_BASE=http://localhost:8000`.

## Build & deploy

```bash
npm run lint
npm run build        # writes the static site to out/
```

Netlify reads `netlify.toml` (build `npm run build`, publish `out`). Connect this repo to the Netlify site and
every push to `main` deploys. After the first deploy, set the backend's `CORS_ALLOWED_ORIGINS` secret to the
site's URL so only this frontend can call the API.

## Structure

```
src/lib/api.ts          API client: types, token refresh, errors, upload progress
src/lib/auth.tsx        Auth state (tokens in localStorage)
src/app/(app)/          Signed-in pages + sidebar layout
src/components/chat/    Message rendering, composer, conversation list
```
