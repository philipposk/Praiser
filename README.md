# Praiser · AI Praise Assistant

**AI Chatbot — Trained to shower your chosen hero with endless praise!**

Praiser is a Next.js application that celebrates and praises a specific person. It uses Groq-powered AI to keep conversations focused on praising the person you choose, with customizable praise intensity and support for images, videos, URLs, and extra information.

## Key Features

- Groq-powered chat that always brings conversations back to praising
- Voice capture with Whisper transcription
- Person info management (name, images, videos, URLs, extra info)
- Praise volume control (0-100%) to adjust enthusiasm level
- Interactive AI messages that can send images of the person
- Beautiful, modern UI with chat window, scroll, and image support

## Getting Started

### 1. Install dependencies

```bash
cd praiser
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and set:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `GROQ_API_KEY` | Required for live chat + transcription. Leave blank and set `PRAISER_USE_GROQ_STUB=true` for offline development. |
| `PRAISER_USE_GROQ_STUB` | Set to `true` to bypass Groq calls and use local stub responses (used by Playwright tests). |

### 3. Run the dev server

```bash
pnpm dev
```

Visit `http://localhost:3000` to start praising!

## Testing

Playwright drives the happy-path UI test with Groq stub mode enabled automatically via the config.

```bash
pnpm test:e2e
```

Traces are captured on the first retry; reports are stored in `playwright-report/`.

## Project Structure

- `praiser/src/state/` — Zustand store for conversation state, person info, and praise volume.
- `praiser/src/lib/` — Shared types and utilities.
- `praiser/src/components/` — Chat UI, person input panel, praise volume control.
- `praiser/src/app/api/groq` — Praise + transcription routes using Groq SDK (with stub fallback).
- `praiser/tests/` — Playwright specs.

## Development Notes

- Conventional commits recommended (e.g., `feat: add person info panel`).
- Run `pnpm lint` before submitting changes.
- Set `PRAISER_USE_GROQ_STUB=true` when developing without credentials; remember to revert for production.

## Deployment

See `praiser/DEPLOYMENT.md` for detailed deployment instructions to Vercel and other platforms.
