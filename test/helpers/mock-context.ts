import { SETTINGS_KEYS } from "../../src/constants.js";
import type {
  EmailLike,
  HttpLike,
  KVEntryLike,
  KVLike,
  PluginContextLike,
  ProviderId
} from "../../src/types.js";

class InMemoryKV implements KVLike {
  private readonly map = new Map<string, unknown>();

  async get<T = unknown>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async list(prefix?: string): Promise<Array<KVEntryLike>> {
    return Array.from(this.map.entries())
      .filter(([key]) => (prefix ? key.startsWith(prefix) : true))
      .map(([key, value]) => ({ key, value }));
  }
}

export interface MockContextOptions {
  email?: EmailLike;
  http?: HttpLike;
}

export function createMockContext(options: MockContextOptions = {}) {
  const kv = new InMemoryKV();
  const logs: Array<{ level: string; message: string; data?: unknown }> = [];

  const ctx: PluginContextLike = {
    plugin: {
      id: "form-mailer",
      version: "0.1.1"
    },
    kv,
    log: {
      info(message, data) {
        logs.push({ level: "info", message, data });
      },
      warn(message, data) {
        logs.push({ level: "warn", message, data });
      },
      error(message, data) {
        logs.push({ level: "error", message, data });
      }
    },
    ...(options.http ? { http: options.http } : {}),
    ...(options.email ? { email: options.email } : {})
  };

  return { ctx, kv, logs };
}

export async function seedConfiguredSettings(
  ctx: PluginContextLike,
  overrides: Partial<{
    provider: ProviderId;
    senderAddress: string;
    recipientAddresses: string[];
    successMessage: string;
    subjectTemplate: string;
    allowedOrigins: string[];
    turnstileEnabled: boolean;
    turnstileSiteKey: string;
    turnstileSecretKey: string;
    honeypotEnabled: boolean;
    strictMode: boolean;
    rateLimitPerMinute: number;
    zeptoMailApiKey: string;
  }> = {}
): Promise<void> {
  await ctx.kv.set(SETTINGS_KEYS.provider, overrides.provider ?? "cloudflare");
  await ctx.kv.set(SETTINGS_KEYS.senderAddress, overrides.senderAddress ?? "sender@example.com");
  await ctx.kv.set(
    SETTINGS_KEYS.recipientAddresses,
    overrides.recipientAddresses ?? ["dest@example.com"]
  );
  await ctx.kv.set(SETTINGS_KEYS.subjectTemplate, overrides.subjectTemplate ?? "[{site}] {formName}");
  await ctx.kv.set(
    SETTINGS_KEYS.successMessage,
    overrides.successMessage ?? "Thanks. Your message has been sent successfully."
  );
  await ctx.kv.set(
    SETTINGS_KEYS.allowedOrigins,
    overrides.allowedOrigins ?? ["https://site.example"]
  );
  await ctx.kv.set(SETTINGS_KEYS.turnstileEnabled, overrides.turnstileEnabled ?? false);
  await ctx.kv.set(SETTINGS_KEYS.turnstileSiteKey, overrides.turnstileSiteKey ?? "");
  await ctx.kv.set(SETTINGS_KEYS.honeypotEnabled, overrides.honeypotEnabled ?? true);
  await ctx.kv.set(SETTINGS_KEYS.honeypotFieldName, "website");
  await ctx.kv.set(SETTINGS_KEYS.strictMode, overrides.strictMode ?? true);
  await ctx.kv.set(SETTINGS_KEYS.rateLimitPerMinute, overrides.rateLimitPerMinute ?? 10);

  if (overrides.turnstileSecretKey) {
    await ctx.kv.set(SETTINGS_KEYS.turnstileSecretKey, overrides.turnstileSecretKey);
  }

  if (overrides.zeptoMailApiKey) {
    await ctx.kv.set(SETTINGS_KEYS.zeptoMailApiKey, overrides.zeptoMailApiKey);
  }
}

export function buildSubmitRequest(body: Record<string, unknown>, init?: {
  origin?: string;
  ip?: string;
  headers?: Record<string, string>;
}): Request {
  return new Request("https://site.example/_emdash/api/plugins/form-mailer/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: init?.origin ?? "https://site.example",
      "CF-Connecting-IP": init?.ip ?? "203.0.113.5",
      ...init?.headers
    },
    body: JSON.stringify(body)
  });
}

export async function captureThrownJson(
  callback: () => Promise<unknown>
): Promise<{ status: number; body: unknown }> {
  try {
    await callback();
  } catch (error) {
    if (error instanceof Response) {
      return {
        status: error.status,
        body: await error.json()
      };
    }
    throw error;
  }

  throw new Error("Expected callback to throw a Response.");
}
