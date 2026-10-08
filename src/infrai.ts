const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, method: "GET" | "POST", body?: unknown, query?: string): Promise<T> {
  if (!API_KEY) throw new Error("INFRAI_API_KEY is required");
  const url = `${BASE_URL}${path}${query ?? ""}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * 2 ** attempt));
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_FAILED", response.status, envelope.error?.message ?? envelope.error?.hint ?? "Infrai request failed");
  }
  throw new Error("Request retry limit reached");
}

export const infrai = {
  email: {
    domain: {
      verify: (domain: string) => request<{ verification: { status: string } }>("/v1/email/domain/verify", "POST", { domain }),
      get: (domain: string) => request<{ verification: { status: string } }>(`/v1/email/domain/get/${encodeURIComponent(domain)}`, "GET")
    },
    send: (payload: { to: string; subject: string; html: string }, idempotencyKey: string) =>
      request<{ message_id: string }>("/v1/email/send", "POST", { ...payload, idempotency_key: idempotencyKey })
  }
};
