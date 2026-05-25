/**
 * Server-side TTS providers. Tried in order; first one configured + reachable
 * wins. If none are configured, /api/tts returns 204 and the client falls back
 * to window.speechSynthesis.
 *
 * Adding a provider: implement the TTSProvider interface and push it into
 * `buildProviders()`. Keep providers pure (no module state) — credentials come
 * from env at construction time.
 */

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const ELEVENLABS_DEFAULT_VOICE = "ueSxRO0nLF1bj93J2hVt"; // strive's bilingual default
const ELEVENLABS_MODEL = "eleven_multilingual_v2";

const HF_XTTS_URL = "https://api-inference.huggingface.co/models/coqui/XTTS-v2";

export type TTSRequest = {
  text: string;
  language?: string; // BCP-47, e.g. 'el', 'en'
  voiceId?: string;
};

export type TTSResult = {
  audio: ArrayBuffer;
  mime: string;
  provider: string;
};

export interface TTSProvider {
  readonly name: string;
  isConfigured(): boolean;
  synth(req: TTSRequest, signal?: AbortSignal): Promise<TTSResult>;
}

/* ---------------------------- ElevenLabs ---------------------------- */

class ElevenLabsProvider implements TTSProvider {
  readonly name = "elevenlabs";
  constructor(private readonly apiKey: string) {}

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async synth(req: TTSRequest, signal?: AbortSignal): Promise<TTSResult> {
    const voice = req.voiceId || ELEVENLABS_DEFAULT_VOICE;
    const url = `${ELEVENLABS_BASE}/${voice}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: req.text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`ElevenLabs ${response.status}: ${body.slice(0, 200)}`);
    }

    const audio = await response.arrayBuffer();
    return { audio, mime: "audio/mpeg", provider: this.name };
  }
}

/* ---------------------------- HuggingFace XTTS-v2 ---------------------------- */

class HuggingFaceXTTSProvider implements TTSProvider {
  readonly name = "huggingface-xtts-v2";
  constructor(private readonly apiKey: string) {}

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async synth(req: TTSRequest, signal?: AbortSignal): Promise<TTSResult> {
    const lang = (req.language || "en").slice(0, 2);

    const response = await fetch(HF_XTTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/wav",
      },
      body: JSON.stringify({
        inputs: req.text,
        parameters: { language: lang },
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HF XTTS ${response.status}: ${body.slice(0, 200)}`);
    }

    const audio = await response.arrayBuffer();
    return { audio, mime: "audio/wav", provider: this.name };
  }
}

/* ---------------------------- Factory ---------------------------- */

let cachedProviders: TTSProvider[] | null = null;

export const buildProviders = (): TTSProvider[] => {
  if (cachedProviders) return cachedProviders;
  const list: TTSProvider[] = [];

  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (elevenKey) list.push(new ElevenLabsProvider(elevenKey));

  const hfKey = process.env.HF_API_KEY ?? process.env.HUGGINGFACE_API_KEY;
  if (hfKey) list.push(new HuggingFaceXTTSProvider(hfKey));

  cachedProviders = list;
  return list;
};

export const synthesizeWithFallback = async (
  req: TTSRequest,
  signal?: AbortSignal,
): Promise<TTSResult | null> => {
  const providers = buildProviders();
  if (providers.length === 0) return null;

  const errors: string[] = [];
  for (const p of providers) {
    if (!p.isConfigured()) continue;
    try {
      return await p.synth(req, signal);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${p.name}: ${msg}`);
      console.warn(`TTS provider ${p.name} failed`, msg);
    }
  }
  throw new Error(`All TTS providers failed: ${errors.join(" | ")}`);
};
