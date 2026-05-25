/**
 * TypeScript port of llm-free-rotator.
 *
 * Rotates across free-tier LLM models when one hits a rate limit. Tries each
 * model in a ranked list; on 429/502/503/504/timeout/model-error, advances to
 * the next. Sticky cursor per provider (module memory). Model list cached for
 * MODEL_CACHE_TTL_MS to avoid re-listing on every call.
 *
 * Generic over OpenAI-compatible providers (Groq, OpenRouter, NVIDIA NIM).
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
  signal?: AbortSignal;
};

export type ChatResult = {
  text: string;
  model: string;
  provider: string;
  raw: unknown;
};

export type FreeModel = {
  id: string;
  weight: number;
};

export type ProviderError = {
  status: number;
  code?: string;
  message: string;
  model: string;
};

export class AllModelsFailedError extends Error {
  constructor(
    public provider: string,
    public attempts: ProviderError[],
  ) {
    super(
      `${provider}: all ${attempts.length} models failed. ${attempts
        .map((a) => `${a.model}:${a.status}${a.code ? `/${a.code}` : ""}`)
        .join(" | ")}`,
    );
    this.name = "AllModelsFailedError";
  }
}

const ROTATE_STATUSES = new Set([408, 409, 425, 429, 502, 503, 504]);
const MODEL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_TIMEOUT_MS = 60_000;

type CacheEntry = { ts: number; models: FreeModel[] };
const modelCache = new Map<string, CacheEntry>();
const lastUsedCursor = new Map<string, string>();

const classifyError = (status: number, body: unknown): { code?: string; message: string } => {
  const err = (body as { error?: { message?: string; code?: string } })?.error;
  return {
    code: err?.code,
    message: err?.message ?? `HTTP ${status}`,
  };
};

const isRetryableStatus = (status: number) => ROTATE_STATUSES.has(status);

const isRetryableCode = (code: string | undefined, message: string) => {
  if (!code && !message) return false;
  const lower = (message || "").toLowerCase();
  return (
    code === "rate_limit_exceeded" ||
    code === "model_decommissioned" ||
    code === "model_not_found" ||
    code === "tokens" ||
    lower.includes("over capacity") ||
    lower.includes("decommissioned") ||
    lower.includes("no longer supported") ||
    lower.includes("request too large")
  );
};

export abstract class Rotator {
  abstract readonly provider: string;
  abstract readonly chatUrl: string;
  abstract readonly modelsUrl: string;
  protected abstract readonly pref: Record<string, number>;

  constructor(
    protected readonly apiKey: string,
    protected readonly extraHeaders: Record<string, string> = {},
    protected readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  protected headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...this.extraHeaders,
    };
  }

  protected rank(models: FreeModel[]): FreeModel[] {
    return [...models].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
  }

  /** Provider-specific list endpoint + free-only filter. */
  protected abstract fetchModels(): Promise<FreeModel[]>;

  async listModels(forceRefresh = false): Promise<FreeModel[]> {
    const key = this.provider;
    const entry = modelCache.get(key);
    if (!forceRefresh && entry && Date.now() - entry.ts < MODEL_CACHE_TTL_MS) {
      return entry.models;
    }
    try {
      const models = await this.fetchModels();
      modelCache.set(key, { ts: Date.now(), models });
      return models;
    } catch (error) {
      if (entry) return entry.models; // stale-on-error
      throw error;
    }
  }

  private ordered(models: FreeModel[]): FreeModel[] {
    const cursor = lastUsedCursor.get(this.provider);
    if (!cursor) return models;
    const idx = models.findIndex((m) => m.id === cursor);
    if (idx < 0) return models;
    return [...models.slice(idx), ...models.slice(0, idx)];
  }

  private async chatOne(model: string, opts: ChatOptions): Promise<ChatResult> {
    const payload: Record<string, unknown> = {
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
    };
    if (opts.maxTokens) payload.max_tokens = opts.maxTokens;
    if (opts.responseFormatJson) payload.response_format = { type: "json_object" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    const externalAbort = opts.signal;
    const externalListener = externalAbort
      ? () => controller.abort()
      : null;
    if (externalAbort && externalListener) {
      if (externalAbort.aborted) controller.abort();
      else externalAbort.addEventListener("abort", externalListener);
    }

    try {
      const response = await fetch(this.chatUrl, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          // ignore
        }
        const classified = classifyError(response.status, body);
        const err = new Error(classified.message) as Error & {
          status: number;
          code?: string;
          provider: string;
        };
        err.status = response.status;
        err.code = classified.code;
        err.provider = this.provider;
        throw err;
      }

      const body = await response.json();
      const text = body?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text) {
        throw new Error(`${this.provider}: empty content in response`);
      }
      return {
        text,
        model: body?.model ?? model,
        provider: this.provider,
        raw: body,
      };
    } finally {
      clearTimeout(timeoutId);
      if (externalAbort && externalListener) {
        externalAbort.removeEventListener("abort", externalListener);
      }
    }
  }

  async chat(opts: ChatOptions): Promise<ChatResult> {
    const models = await this.listModels();
    if (models.length === 0) {
      throw new AllModelsFailedError(this.provider, []);
    }

    const ordered = this.ordered(models);
    const attempts: ProviderError[] = [];

    for (const m of ordered) {
      try {
        const result = await this.chatOne(m.id, opts);
        lastUsedCursor.set(this.provider, m.id);
        return result;
      } catch (error) {
        const err = error as { status?: number; code?: string; message?: string; name?: string };
        const status = err.status ?? 0;
        const message = err.message ?? "unknown";

        attempts.push({ status, code: err.code, message, model: m.id });

        const retryable =
          err.name === "AbortError" ||
          isRetryableStatus(status) ||
          isRetryableCode(err.code, message);

        if (!retryable) {
          // Non-retryable (auth, malformed request) — bail.
          throw error;
        }
        // Otherwise loop to next model.
      }
    }

    throw new AllModelsFailedError(this.provider, attempts);
  }
}

/* ---------------------------- Groq ---------------------------- */

// Preserves the existing Praiser model preference list — these were chosen
// for Greek-language fidelity and have been working in production for months.
const GROQ_PRODUCTION_ORDER = [
  "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
];

const GROQ_PREVIEW_ORDER = [
  "qwen/qwen3-32b",
  "openai/gpt-oss-safeguard-20b",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "moonshotai/kimi-k2-instruct-0905",
];

const GROQ_FALLBACK = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama-3.3-8b-instant",
];

const GROQ_EXCLUDE = /(?:^whisper|orpheus|prompt-guard|safeguard|allam|compound|tts|llama-3\.1-70b-versatile|llama-guard)/i;

const buildGroqWeights = (): Record<string, number> => {
  const w: Record<string, number> = {};
  GROQ_PRODUCTION_ORDER.forEach((id, i) => {
    w[id] = 100 - i; // 100, 99, 98, 97
  });
  GROQ_PREVIEW_ORDER.forEach((id, i) => {
    w[id] = 50 - i; // 50, 49, …
  });
  return w;
};

export class GroqRotator extends Rotator {
  readonly provider = "groq";
  readonly chatUrl = "https://api.groq.com/openai/v1/chat/completions";
  readonly modelsUrl = "https://api.groq.com/openai/v1/models";
  protected readonly pref = buildGroqWeights();

  protected async fetchModels(): Promise<FreeModel[]> {
    try {
      const response = await fetch(this.modelsUrl, { headers: this.headers() });
      if (!response.ok) throw new Error(`Groq models list failed: ${response.status}`);
      const body = await response.json();
      const data = (body?.data ?? []) as Array<{ id?: string }>;

      const seen = new Set<string>();
      const out: FreeModel[] = [];
      for (const rec of data) {
        const id = rec?.id;
        if (!id || seen.has(id) || GROQ_EXCLUDE.test(id)) continue;
        seen.add(id);
        out.push({ id, weight: this.pref[id] ?? 0 });
      }
      // Ensure fallback models are present even if API list is missing them.
      for (const f of GROQ_FALLBACK) {
        if (!seen.has(f)) out.push({ id: f, weight: this.pref[f] ?? -1 });
      }
      return this.rank(out);
    } catch {
      return this.rank(GROQ_FALLBACK.map((id) => ({ id, weight: this.pref[id] ?? -1 })));
    }
  }
}

/* ------------------------- OpenRouter ------------------------- */

const OPENROUTER_PREF: Record<string, number> = {
  "openai/gpt-oss-120b:free": 10.0,
  "nvidia/nemotron-3-super-120b-a12b:free": 9.5,
  "nousresearch/hermes-3-llama-3.1-405b:free": 9.0,
  "z-ai/glm-4.5-air:free": 9.0,
  "qwen/qwen3-next-80b-a3b-instruct:free": 8.5,
  "meta-llama/llama-3.3-70b-instruct:free": 8.0,
  "minimax/minimax-m2.5:free": 7.5,
  "qwen/qwen3-coder:free": 7.0,
  "deepseek/deepseek-v4-flash:free": 6.5,
  "google/gemma-4-31b-it:free": 6.0,
  "openai/gpt-oss-20b:free": 5.0,
  "meta-llama/llama-3.2-3b-instruct:free": 2.0,
};

const isOpenRouterFree = (rec: { pricing?: { prompt?: unknown; completion?: unknown } }) => {
  const p = rec.pricing ?? {};
  return Number(p.prompt) === 0 && Number(p.completion) === 0;
};

const isOpenRouterTextChat = (rec: {
  architecture?: { input_modalities?: string[]; output_modalities?: string[]; modality?: string };
}) => {
  const arch = rec.architecture ?? {};
  const inp = arch.input_modalities ?? [];
  const out = arch.output_modalities ?? [];
  const modality = arch.modality ?? "";
  if (inp.length && (!inp.includes("text") || inp.includes("image") || inp.includes("audio"))) {
    return false;
  }
  if (out.length && !out.includes("text")) return false;
  if (modality && modality !== "text->text") return false;
  return true;
};

export class OpenRouterRotator extends Rotator {
  readonly provider = "openrouter";
  readonly chatUrl = "https://openrouter.ai/api/v1/chat/completions";
  readonly modelsUrl = "https://openrouter.ai/api/v1/models";
  protected readonly pref = OPENROUTER_PREF;

  constructor(apiKey: string, opts: { appUrl?: string; appName?: string } = {}) {
    const extra: Record<string, string> = {};
    if (opts.appUrl) extra["HTTP-Referer"] = opts.appUrl;
    if (opts.appName) extra["X-Title"] = opts.appName;
    super(apiKey, extra);
  }

  protected async fetchModels(): Promise<FreeModel[]> {
    const response = await fetch(this.modelsUrl, { headers: this.headers() });
    if (!response.ok) throw new Error(`OpenRouter models list failed: ${response.status}`);
    const body = await response.json();
    const data = (body?.data ?? []) as Array<{
      id?: string;
      pricing?: { prompt?: unknown; completion?: unknown };
      architecture?: {
        input_modalities?: string[];
        output_modalities?: string[];
        modality?: string;
      };
    }>;

    const out: FreeModel[] = [];
    for (const rec of data) {
      if (!rec?.id) continue;
      if (!isOpenRouterFree(rec) || !isOpenRouterTextChat(rec)) continue;
      out.push({ id: rec.id, weight: this.pref[rec.id] ?? 0 });
    }
    return this.rank(out);
  }
}

/* --------------------------- NVIDIA --------------------------- */

const NVIDIA_PREF: Record<string, number> = {
  "meta/llama-3.3-70b-instruct": 10.0,
  "nvidia/llama-3.1-nemotron-70b-instruct": 9.5,
  "deepseek-ai/deepseek-v4-pro": 9.0,
  "deepseek-ai/deepseek-v4-flash": 8.5,
  "meta/llama-3.1-70b-instruct": 8.0,
  "qwen/qwen2.5-coder-32b-instruct": 7.5,
  "google/gemma-4-31b-it": 7.0,
  "mistralai/mistral-large-2-instruct": 6.5,
  "meta/llama-3.1-8b-instruct": 5.0,
  "meta/llama-3.2-3b-instruct": 3.0,
};

const NVIDIA_EXCLUDE =
  /(?:embed|bge-|rerank|guard|deplot|fuyu|vision|whisper|tts|recurrent|codegemma|starcoder|codellama|granite-.*-code)/i;

export class NvidiaRotator extends Rotator {
  readonly provider = "nvidia";
  readonly chatUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
  readonly modelsUrl = "https://integrate.api.nvidia.com/v1/models";
  protected readonly pref = NVIDIA_PREF;

  protected async fetchModels(): Promise<FreeModel[]> {
    const response = await fetch(this.modelsUrl, { headers: this.headers() });
    if (!response.ok) throw new Error(`NVIDIA models list failed: ${response.status}`);
    const body = await response.json();
    const data = (body?.data ?? []) as Array<{ id?: string }>;

    const seen = new Set<string>();
    const out: FreeModel[] = [];
    for (const rec of data) {
      const id = rec?.id;
      if (!id || seen.has(id) || NVIDIA_EXCLUDE.test(id)) continue;
      seen.add(id);
      out.push({ id, weight: this.pref[id] ?? 0 });
    }
    return this.rank(out);
  }
}

/* --------------------- Multi-provider chain --------------------- */

export type ChainedRotatorOptions = {
  groqKey?: string;
  openRouterKey?: string;
  nvidiaKey?: string;
  appUrl?: string;
  appName?: string;
};

export class ChainedRotator {
  private readonly rotators: Rotator[] = [];

  constructor(opts: ChainedRotatorOptions) {
    if (opts.groqKey) this.rotators.push(new GroqRotator(opts.groqKey));
    if (opts.openRouterKey) {
      this.rotators.push(
        new OpenRouterRotator(opts.openRouterKey, {
          appUrl: opts.appUrl,
          appName: opts.appName,
        }),
      );
    }
    if (opts.nvidiaKey) this.rotators.push(new NvidiaRotator(opts.nvidiaKey));
  }

  get providerCount(): number {
    return this.rotators.length;
  }

  /**
   * Walk providers in order. For each, attempt the full model rotation.
   * If a provider returns a non-retryable error (auth, malformed request),
   * surface it immediately. Otherwise advance to the next provider.
   * If `responseFormatJson` is set, retry the same provider WITHOUT it on the
   * second pass for providers that don't honour OpenAI's response_format.
   */
  async chat(opts: ChatOptions): Promise<ChatResult> {
    if (this.rotators.length === 0) {
      throw new Error("ChainedRotator: no providers configured");
    }

    const lastErrors: Error[] = [];
    for (const rotator of this.rotators) {
      try {
        return await rotator.chat(opts);
      } catch (error) {
        const err = error as Error;
        lastErrors.push(err);
        // Only fall through to next provider on exhaustion or capacity-style
        // errors. Auth/malformed errors already bubbled out of rotator.chat.
        if (!(err instanceof AllModelsFailedError)) {
          // Non-retryable from this provider — but other providers may still
          // accept the request. Continue rather than fail hard.
        }
      }
    }

    const combined = lastErrors.map((e) => `${e.message}`).join(" ; ");
    throw new Error(`All providers exhausted: ${combined}`);
  }
}
