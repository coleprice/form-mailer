import { RUNTIME_ERROR_TTL_MS } from "../constants.js";
import { clearRuntimeError, storeRuntimeError } from "../settings.js";
import type {
  NormalizedMessage,
  PluginContextLike,
  PluginSettings,
  SendResult
} from "../types.js";
import { createProvider } from "./provider-factory.js";

function redactRecipient(addresses: string[]): string {
  const first = addresses[0];
  if (!first) {
    return "unknown";
  }

  const [, ...rest] = addresses;
  const [localPart = "", domain = ""] = first.split("@");
  const redacted = `${localPart.slice(0, 1) || "*"}***@${domain}`;
  return rest.length > 0 ? `${redacted} (+${rest.length} more)` : redacted;
}

function fromDomain(senderAddress: string): string {
  return senderAddress.split("@")[1] ?? "unknown";
}

function logPayload(message: NormalizedMessage, result: SendResult) {
  return {
    provider: result.provider,
    from_domain: fromDomain(message.from.email),
    to_recipient_redacted: redactRecipient(message.to),
    error_type: result.errorType ?? null,
    error_message: result.errorMessage ?? null,
    retry_count: 0,
    submission_id: message.submissionId ?? null
  };
}

export function createMailService(ctx: PluginContextLike, settings: PluginSettings) {
  return {
    async deliver(message: NormalizedMessage): Promise<SendResult> {
      const provider = createProvider(ctx, settings);
      const result = await provider.send(message);

      if (result.ok) {
        await clearRuntimeError(ctx);
        ctx.log.info("form_mailer_send_success", logPayload(message, result));
        return result;
      }

      await storeRuntimeError(ctx, {
        provider: result.provider,
        errorType: result.errorType ?? "send_failed",
        errorMessage: result.errorMessage ?? "Unknown send failure",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + RUNTIME_ERROR_TTL_MS).toISOString(),
        ...(message.submissionId ? { submissionId: message.submissionId } : {})
      });

      ctx.log.error("form_mailer_send_failure", logPayload(message, result));
      return result;
    },

    async enqueue(message: NormalizedMessage): Promise<SendResult> {
      return this.deliver(message);
    }
  };
}
