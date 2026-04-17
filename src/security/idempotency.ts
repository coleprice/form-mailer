import { IDEMPOTENCY_TTL_MS } from "../constants.js";
import type {
  PluginContextLike,
  StoredIdempotencyRecord,
  SubmissionResponse
} from "../types.js";

function keyFor(submissionId: string): string {
  return `idem:${submissionId}`;
}

export async function getIdempotentResponse(
  ctx: PluginContextLike,
  submissionId: string,
  now: Date
): Promise<SubmissionResponse | undefined> {
  const record = await ctx.kv.get<StoredIdempotencyRecord>(keyFor(submissionId));
  if (!record) {
    return undefined;
  }

  if (Date.parse(record.expiresAt) <= now.getTime()) {
    await ctx.kv.delete(keyFor(submissionId));
    return undefined;
  }

  return record.response;
}

export async function storeIdempotentResponse(
  ctx: PluginContextLike,
  submissionId: string,
  response: SubmissionResponse,
  now: Date
): Promise<void> {
  await ctx.kv.set(keyFor(submissionId), {
    expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS).toISOString(),
    response
  } satisfies StoredIdempotencyRecord);
}

