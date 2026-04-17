import {
  DEFAULT_SUCCESS_MESSAGE,
  SUBMISSION_ID_HEADER
} from "../constants.js";
import { buildNormalizedMessage } from "../mail/message-builder.js";
import { createMailService } from "../mail/mail-service.js";
import { errorResponse, jsonError, successResponse, validationResponse } from "../responses.js";
import { getSettings } from "../settings.js";
import { isHoneypotTriggered } from "../security/honeypot.js";
import {
  getIdempotentResponse,
  storeIdempotentResponse
} from "../security/idempotency.js";
import { consumeRateLimit } from "../security/rate-limit.js";
import { verifyTurnstile } from "../security/turnstile.js";
import { validateSubmissionBody } from "../security/validate-submission.js";
import type {
  PluginContextLike,
  RouteContextLike,
  SubmitRouteDependencies
} from "../types.js";

function getClientIp(request: Request): string {
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) {
    return cfIp;
  }

  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return "unknown";
}

function isOriginAllowed(request: Request, allowedOrigins: string[]): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) {
    return false;
  }

  if (allowedOrigins.length > 0) {
    return allowedOrigins.includes(origin);
  }

  return origin === new URL(request.url).origin;
}

export async function handleSubmitRoute(
  routeCtx: RouteContextLike,
  ctx: PluginContextLike,
  deps: SubmitRouteDependencies = {}
): Promise<unknown> {
  const now = deps.now?.() ?? new Date();
  const request = routeCtx.request;

  if (request.method !== "POST") {
    jsonError(405, errorResponse("validation_error", "Only POST submissions are accepted."));
  }

  const origin = request.headers.get("Origin");
  if (!origin) {
    ctx.log.warn("form_mailer_origin_rejected", {
      reason: "missing_origin"
    });
    jsonError(
      403,
      errorResponse("origin_not_allowed", "This origin is not allowed to submit this form.")
    );
  }

  const settings = await getSettings(ctx);
  if (!isOriginAllowed(request, settings.allowedOrigins)) {
    ctx.log.warn("form_mailer_origin_rejected", {
      reason: "origin_not_allowed",
      origin
    });
    jsonError(
      403,
      errorResponse("origin_not_allowed", "This origin is not allowed to submit this form.")
    );
  }

  const submissionId = request.headers.get(SUBMISSION_ID_HEADER) ?? undefined;
  if (submissionId) {
    try {
      const cached = await getIdempotentResponse(ctx, submissionId, now);
      if (cached) {
        return cached;
      }
    } catch (error) {
      ctx.log.warn("form_mailer_idempotency_read_failed", {
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const rawBody = await request.text();
  const parsed = validateSubmissionBody({
    rawBody,
    strictMode: settings.strictMode
  });

  if (!parsed.value) {
    ctx.log.warn("form_mailer_validation_rejected", {
      errors: parsed.errors
    });
    jsonError(
      400,
      validationResponse(
        "Your submission could not be processed.",
        parsed.errors
      )
    );
  }

  if (isHoneypotTriggered(parsed.value.honeypot, settings.honeypotEnabled)) {
    ctx.log.warn("form_mailer_spam_rejected", {
      reason: "honeypot_triggered",
      submission_id: submissionId ?? null
    });
    return successResponse(settings.successMessage || DEFAULT_SUCCESS_MESSAGE);
  }

  if (settings.turnstileEnabled) {
    const verified = await verifyTurnstile({
      ctx,
      token: parsed.value.turnstileToken,
      secret: settings.turnstileSecretKey,
      remoteIp: getClientIp(request)
    });

    if (!verified) {
      ctx.log.warn("form_mailer_spam_rejected", {
        reason: "turnstile_failed",
        submission_id: submissionId ?? null
      });
      jsonError(
        403,
        errorResponse(
          "spam_rejected",
          "Your submission could not be accepted."
        )
      );
    }
  }

  const allowed = await consumeRateLimit({
    ctx,
    ip: getClientIp(request),
    limit: settings.rateLimitPerMinute,
    now
  });

  if (!allowed) {
    ctx.log.warn("form_mailer_rate_limited", {
      submission_id: submissionId ?? null
    });
    jsonError(
      429,
      errorResponse(
        "rate_limited",
        "Too many submissions from this IP. Please try again in a minute."
      )
    );
  }

  if (!settings.senderAddress || settings.recipientAddresses.length === 0) {
    jsonError(
      500,
      errorResponse(
        "configuration_error",
        "Form Mailer is not configured correctly."
      )
    );
  }

  if (settings.provider === "zeptomail" && !settings.zeptoMailApiKey) {
    jsonError(
      500,
      errorResponse(
        "configuration_error",
        "ZeptoMail is selected, but its API key has not been configured."
      )
    );
  }

  const message = buildNormalizedMessage({
    settings,
    submission: parsed.value,
    origin,
    ip: getClientIp(request),
    ...(submissionId ? { submissionId } : {})
  });
  const mailService = {
    enqueue: async () => {
      if (deps.deliver) {
        return deps.deliver(ctx, settings, message);
      }
      return createMailService(ctx, settings).enqueue(message);
    }
  };
  const result = await mailService.enqueue();

  if (!result.ok) {
    jsonError(
      500,
      errorResponse(
        "send_failed",
        "We couldn't send your message right now. Please try again later."
      )
    );
  }

  const response = successResponse(settings.successMessage || DEFAULT_SUCCESS_MESSAGE);
  if (submissionId) {
    try {
      await storeIdempotentResponse(ctx, submissionId, response, now);
    } catch (error) {
      ctx.log.warn("form_mailer_idempotency_write_failed", {
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return response;
}
