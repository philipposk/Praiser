# Praiser

Praiser is a fun chat app that celebrates someone you care about. You pick a person — a friend, your partner, your mum, a teammate — give it their name, a couple of photos, and a short story about them, and the app writes warm, hyped-up praise about them. You can read it on screen or have it spoken out loud, in English or Greek.

It's made for sending a quick hype message, writing a birthday note in seconds, or just making someone smile. It's completely free to use.

## What it does
- Writes praise, hype, birthday notes, tributes, and even playful roasts about a person you choose
- Speaks the message out loud, and can listen and reply hands-free like a voice chat
- Works in both English and Greek
- Lets you keep several different people in one place, each with their own style
- Comes with ready-made characters (like famous historical figures) you can chat with in one click
- Remembers details about each person so future messages feel personal
- Can create a portrait picture for made-up or historical people
- Lets you share a chat with a link that looks nice when posted to social media or messaging apps

## Status
Working website / web app. The current app lives in the `praiser/` folder; other folders are older copies and experiments.

---
### For developers
Next.js 16 + TypeScript (strict). Notable engineering: 3-provider LLM rotation (Groq → OpenRouter → NVIDIA NIM) with sticky cursor, model cache, and automatic fallback on throttling — runs at zero cost while any free tier has capacity. Streaming responses via Server-Sent Events; long-term memory extracted into compact fact bullets every few replies (no DB); three-tier TTS (ElevenLabs → HuggingFace XTTS-v2 → browser speech) plus per-person voice cloning; live voice mode with VAD + Whisper; vision input via Groq Llama 4 Scout; AI portraits via Pollinations Flux; Wikipedia bio import; public chat permalinks with edge-rendered OG cards; single-Vercel-Blob persistence with debounced saves and version-gated migrations; fully bilingual EN/EL. Run:

```bash
cd praiser
pnpm install
cp .env.example .env.local
pnpm dev
```

License: MIT.
