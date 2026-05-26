<div align="center">

# praiser<span style="color:#B8451F">.</span>

**AI that celebrates anyone you love — free, multilingual, hands-free.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Free forever](https://img.shields.io/badge/Free-forever-B8451F)](#)
[![Languages: EN · EL](https://img.shields.io/badge/Languages-EN%20%C2%B7%20EL-1B1611)](#)

Type. Speak. Or let it speak back to you.

</div>

---

## What it is

Praiser is a chat app that praises, hypes, and celebrates a person you choose. You give it a name, some photos, and a short story. It does the rest — in English, in Greek, in writing, or out loud.

Built for fun (praise your friend, hype your partner, write a birthday note in two seconds). Engineered like a portfolio piece (provider rotation, streaming, hands-free voice, edge OG cards, theme-aware design system).

## Why it might catch your eye

| Feature | What it does | Why it matters |
|---|---|---|
| **3-provider LLM rotation** | Groq → OpenRouter → NVIDIA NIM, sticky cursor per provider, 1h model cache, automatic fallback on 429/503/decommissioned | Most chat apps hard-code one API. This stays online when free tiers throttle. Zero-cost runtime as long as any provider has capacity. |
| **Streaming responses** | Server-Sent Events from `/api/groq/praise`, token-by-token UI updates | First token lands in ~300ms instead of 2-3s. Feels alive. |
| **Multi-person workspace + 7 modes** | One workspace, many subjects. Each has its own mode: praise · roast · hype · birthday · anniversary · affirmation · tribute. System prompt branches per mode. | Same engine, completely different first-impression. Roast your friend, write a birthday card for your mum, hype your team. |
| **Curated persona presets** | One-click load: Socrates, Mr. Rogers, Mary Oliver, Bob Ross, Marcus Aurelius, Carl Sagan, Ada Lovelace, Heracles. Each ships with a fitting default mode. | First-run friction = zero. Pick a preset, chat. |
| **Long-term memory** | Every 8 assistant replies, low-temp call extracts compact fact bullets from the conversation and merges into the person's `memory`. Memory is injected into the system prompt on future chats. | Solves Character.AI's #1 user complaint ("the bot forgets") with no DB and no extra latency on user turns. |
| **AI-generated portraits** | "Generate portrait" button in SettingsDrawer. POST `/api/portrait` builds a prompt from name + lore, calls Pollinations Flux (free, no key), stashes in Vercel Blob. | Instant photo for fictional / historical personas. |
| **Wikipedia bio import** | "From Wikipedia" button in SettingsDrawer fetches REST summary endpoint in the active UI language, appends extract to lore + adds thumbnail to images. | Drop in a Wikipedia bio in two clicks, no copy-paste. |
| **Public chat permalinks** | `POST /api/chats/share` snapshots the chat + person to a Vercel Blob and returns an 8-char shortcode. `/c/[shortcode]` renders read-only with dynamic OG metadata. | WhatsApp / Twitter / Slack unfurl with the warm-paper share card. Viral loop. |
| **Live voice mode** | Push the radio icon. Mic stays on, RMS VAD detects silence, Whisper transcribes, response streams back, browser TTS speaks, mic re-arms automatically. | Hands-free conversation, ~2s round-trip, free. |
| **Voice cloning per person** | Upload a 10–60s audio sample → ElevenLabs `/voices/add` → stored as `personInfo.ttsVoiceId`. TTS uses that voice automatically. | The person speaks praise about themselves. Unreasonably funny. |
| **Three-tier TTS** | ElevenLabs → HuggingFace XTTS-v2 → `window.speechSynthesis`. Server returns 204 if no key configured so client falls back to browser. | Works for free; upgrades automatically if you add a key. |
| **Vision input** | Drag a photo into the composer → routed to Groq Llama 4 Scout for actual analysis. | "Praise the smile in this selfie" actually praises the smile. |
| **Edge OG cards** | `/api/og?text=…&name=…&image=…` returns a 1200×630 PNG with warm-paper styling, served from Edge runtime. | Shares unfurl with a beautiful card on every social platform. |
| **Single-blob persistence** | One Vercel Blob holds all user settings. Debounced 500ms saves, localStorage cache for instant first paint, version-gated migrations. | Survives incognito, syncs across devices, no DB. |
| **Bilingual everything** | Greek + English UI, system prompt, voice detection, name-variation generator (μάικ / Mike / Μιχάλης / Michalis Kou). | Few competitors handle Greek at all. |

## Screenshots

> Add `docs/screenshot-light.png` and `docs/screenshot-dark.png` to make these render.

| Light (default) | Dark |
|---|---|
| ![Praiser light](docs/screenshot-light.png) | ![Praiser dark](docs/screenshot-dark.png) |

## Try it locally

```bash
git clone https://github.com/philipposk/Praiser
cd Praiser/praiser
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>.

### Stub mode (no API key)

```bash
echo "PRAISER_USE_GROQ_STUB=true" >> .env.local
pnpm dev
```

The app returns canned responses so you can poke the UI without burning Groq credits.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | recommended | Primary LLM (chat) + Whisper STT. [Get one free](https://console.groq.com/keys). |
| `OPENROUTER_API_KEY` | optional | Secondary LLM provider; falls back here when Groq exhausts. [Free tier](https://openrouter.ai/keys). |
| `NVCF_API_KEY` (or `NVIDIA_API_KEY`) | optional | Tertiary LLM provider (NVIDIA NIM). [Get one](https://build.nvidia.com). |
| `BLOB_READ_WRITE_TOKEN` | required on Vercel | Settings persistence. Auto-set by Vercel when you connect a Blob store. |
| `ELEVENLABS_API_KEY` | optional | Premium TTS (highest quality, paid). |
| `HF_API_KEY` | optional | HuggingFace XTTS-v2 TTS (free tier, slow cold start). |
| `NEXT_PUBLIC_SITE_URL` | optional | Used in OG meta tags. Defaults to `https://praiser.vercel.app`. |
| `PRAISER_USE_GROQ_STUB` | optional | `true` to bypass LLM calls in dev/test. |

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Browser                                                       │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Sidebar  │  │ ChatPanel  │  │ Subject  │  │ SettingsDrawer│ │
│  │ chats    │  │ messages   │  │ Panel    │  │ persons+mode  │ │
│  └────┬─────┘  └─────┬──────┘  └──────────┘  └──────┬───────┘ │
│       │              │                              │          │
│       └──────────────┴── Zustand store ─────────────┘          │
│                          │                                     │
│       ┌──────────────────┼──────────────────┐                  │
│       │                  │                  │                  │
│   useChatController  useLiveVoiceMode   useTextToSpeech        │
│       │                  │                  │                  │
│       │      VAD ◄── MediaRecorder      browser TTS            │
│       │                  │                  ▲                  │
│       ▼                  ▼                  │                  │
│  /api/groq/praise   /api/groq/transcribe   /api/tts            │
│  (SSE stream)       (Whisper, lang hint)   (EL + HF + 204)     │
└──────────┬───────────────┬───────────────────┬─────────────────┘
           │               │                   │
           ▼               ▼                   ▼
   ┌──────────────────────────────────┐  ┌─────────────────┐
   │  ChainedRotator  (lib/llm-rotator)│  │  TTSProvider    │
   │  ┌─────────┐ ┌────────────┐ ┌───┐ │  │  chain          │
   │  │  Groq   │→│ OpenRouter │→│NV │ │  │  ┌────────────┐ │
   │  │ sticky  │ │  sticky    │ │NIM│ │  │  │ElevenLabs  │ │
   │  └─────────┘ └────────────┘ └───┘ │  │  └────────────┘ │
   │  per-provider model cache (1h)    │  │  ┌────────────┐ │
   │  per-provider sticky cursor       │  │  │HF XTTS-v2  │ │
   │  retryable: 429/502/503/504/cap.  │  │  └────────────┘ │
   └───────────────────────────────────┘  └─────────────────┘
                  │
                  ▼
            Settings blob (single JSON, version-gated, 5MB cap)
```

## Tech

- **Framework** Next.js 16 (App Router, Turbopack, Edge + Node runtimes)
- **Language** TypeScript, strict
- **State** Zustand 5 with a single settings blob + localStorage cache layer
- **LLM** Groq SDK + custom multi-provider rotator (`src/lib/llm-rotator.ts`)
- **Streaming** Server-Sent Events with delta unwrapping
- **STT** Groq Whisper Large v3 Turbo with BCP-47 language hint
- **TTS** Server provider chain (ElevenLabs, HF XTTS-v2) → browser `speechSynthesis`
- **VAD** Custom RMS detector on `AudioContext` + `AnalyserNode`, zero deps
- **Storage** Vercel Blob (single settings.json keyed by version)
- **Validation** Zod everywhere on API boundaries
- **OG images** `next/og` on Edge runtime
- **UI** Custom CSS (warm-paper palette, light + `[data-theme=dark]`), Instrument Serif + Geist + JetBrains Mono

## Project layout

```
praiser/
  src/
    app/
      api/
        groq/praise/route.ts        # rotator + SSE streaming + JSON fallback
        groq/transcribe/route.ts    # Whisper, language hint
        tts/route.ts                # provider chain, 204 fallback
        og/route.tsx                # edge OG card generator
        settings/route.ts           # blob persistence
        upload/route.ts             # media to Vercel Blob
      layout.tsx, page.tsx, globals.css
    components/
      chat/        ChatPanel, ChatComposer, MessageBubble, EmptyState, TopBar
      sidebar/     Sidebar
      subject/     SubjectPanel (portrait, praise dial, lore, gallery)
      settings/    SettingsDrawer
      ui/          Icon, Lightbox
    hooks/
      use-chat-controller.ts        # SSE consumer
      use-text-to-speech.ts         # server → browser fallback
      use-vad.ts                    # RMS voice activity detection
      use-live-voice-mode.ts        # mic ↔ STT ↔ LLM ↔ TTS loop
      use-praise-mode.ts            # crescendo / auto-random sequence
    lib/
      llm-rotator.ts                # GroqRotator + OpenRouter + NVIDIA + ChainedRotator
      tts-providers.ts              # ElevenLabs + HuggingFace XTTS-v2
      types.ts, utils.ts
    state/
      app-store.ts                  # Zustand store + persistence
```

## How rotation works

`ChainedRotator.chat()` walks the configured providers in order. Each provider's `Rotator.chat()` walks its own ranked model list with a sticky cursor (last successful model jumps to the front next call). Errors are classified:

- `429 / 502 / 503 / 504`, `over capacity`, `model_decommissioned`, `tokens` → **retryable** (try next model)
- `401`, `400`, malformed body → **non-retryable** (bail)

If a provider exhausts all its models, the next provider in the chain takes over. Streaming uses the identical machinery via `chatStream()` (async generator yielding deltas, returning model + provider metadata when done).

## Voice flow

```
[user clicks Radio]
    └─► getUserMedia (echo-cancel + noise-suppress + AGC)
        └─► MediaRecorder + AnalyserNode (RMS VAD, 50ms frames)
              │
              ├──── RMS > 0.025 for 150ms ──► speaking
              └──── silent for 900ms ─► onSpeechEnd()
                    └─► recorder.stop() → blob
                        └─► POST /api/groq/transcribe (language=el|en)
                            └─► Whisper text → sendUserMessage()
                                └─► POST /api/groq/praise (SSE)
                                    └─► tokens append to last message
                                    └─► on done: pauseMic()
                                        └─► /api/tts (or speechSynthesis)
                                            └─► onEnd: resumeMic()
                                                └─► (loop)
```

## Roadmap

- [x] Multi-provider LLM rotation
- [x] Live voice mode with VAD
- [x] Streaming responses (both branches)
- [x] Edge OG share cards
- [x] Vision input (Groq Llama 4 Scout)
- [x] Bilingual EL + EN
- [x] Multi-person workspace
- [x] Mode selector (7 modes: praise / roast / hype / birthday / anniversary / affirmation / tribute)
- [x] Curated persona presets
- [x] Public chat permalinks (`/c/[shortcode]`)
- [x] Wikipedia bio import
- [x] AI-generated portraits (Pollinations)
- [x] Voice cloning per person (ElevenLabs)
- [x] Long-term memory (auto-summarise)
- [x] Playwright test suite + GitHub Actions CI
- [x] Sentry error monitoring (optional)
- [ ] Telegram bot
- [ ] Slack / Teams app
- [ ] RAG over arbitrary URLs (beyond Wikipedia)
- [ ] Capacitor mobile wrapper

## API endpoints (full surface)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/groq/praise` | Chat completion. SSE stream when no image-send needed, JSON otherwise. |
| POST | `/api/groq/transcribe` | Whisper STT with BCP-47 `language` hint. |
| POST | `/api/tts` | Server-side TTS with provider chain. Returns 204 if no key. |
| POST | `/api/tts/clone` | ElevenLabs voice cloning. Returns `voice_id`. |
| GET  | `/api/tts/clone` | Capability probe. |
| POST | `/api/og` (GET) | Edge OG share-card PNG generator. |
| POST | `/api/og?...` (GET) | Same; query: `text` `name` `image` `lang`. |
| POST | `/api/upload` | Image / video upload to Vercel Blob. |
| GET  | `/api/settings` | Load user settings blob. |
| POST | `/api/settings` | Save user settings blob. |
| GET  | `/api/import/wikipedia?q=&lang=` | Wikipedia REST summary proxy. |
| POST | `/api/portrait` | AI portrait via Pollinations Flux. |
| POST | `/api/chats/share` | Snapshot chat → shortcode. |
| GET  | `/api/chats/share?code=` | Fetch shared chat by shortcode. |
| POST | `/api/persons/memorize` | Extract memory bullets from conversation. |
| GET  | `/c/[shortcode]` | Public read-only chat page with dynamic OG metadata. |

## Development

```bash
pnpm dev          # local dev (port 3000 by default)
pnpm build        # production build
pnpm lint         # ESLint with --max-warnings=0
pnpm test:e2e     # Playwright (uses stub mode automatically)
```

## License

MIT
