import {
  RATE_LIMIT_TTL_MS,
  RATE_LIMIT_WINDOW_MS
} from "../constants.js";
import type { PluginContextLike, StoredRateLimitRecord } from "../types.js";

export async function consumeRateLimit(input: {
  ctx: PluginContextLike;
  ip: string;
  limit: number;
  now: Date;
}): Promise<boolean> {
  const bucket = Math.floor(input.now.getTime() / RATE_LIMIT_WINDOW_MS);
  const key = `ratelimit:${input.ip}:${bucket}`;
  const existing = await input.ctx.kv.get<StoredRateLimitRecord>(key);
  const expiresAt = new Date(input.now.getTime() + RATE_LIMIT_TTL_MS).toISOString();

  if (existing && Date.parse(existing.expiresAt) > input.now.getTime()) {
    if (existing.count >= input.limit) {
      return false;
    }

    await input.ctx.kv.set(key, {
      count: existing.count + 1,
      expiresAt
    });
    return true;
  }

  await input.ctx.kv.set(key, {
    count: 1,
    expiresAt
  });
  return true;
}

