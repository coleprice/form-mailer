export const PLUGIN_ID = "form-mailer";
export const PLUGIN_VERSION = "0.1.2";
export const SANDBOX_ENTRYPOINT = "form-mailer/sandbox";

export const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email";
export const SUBMISSION_ID_HEADER = "X-Submission-Id";

export const MAX_SUBMISSION_BYTES = 64 * 1024;
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
export const RUNTIME_ERROR_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RATE_LIMIT_TTL_MS = 120 * 1000;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export const DEFAULT_SUBJECT_TEMPLATE = "[{site}] {formName}";
export const DEFAULT_SUCCESS_MESSAGE =
  "Thanks. Your message has been sent successfully.";
export const DEFAULT_HONEYPOT_FIELD_NAME = "website";
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 10;

export const SETTINGS_KEYS = {
  provider: "settings:provider",
  senderAddress: "settings:senderAddress",
  recipientAddresses: "settings:recipientAddresses",
  subjectTemplate: "settings:subjectTemplate",
  successMessage: "settings:successMessage",
  allowedOrigins: "settings:allowedOrigins",
  turnstileSiteKey: "settings:turnstileSiteKey",
  turnstileSecretKey: "settings:turnstileSecretKey",
  honeypotFieldName: "settings:honeypotFieldName",
  rateLimitPerMinute: "settings:rateLimitPerMinute",
  turnstileEnabled: "settings:turnstileEnabled",
  honeypotEnabled: "settings:honeypotEnabled",
  strictMode: "settings:strictMode",
  zeptoMailApiKey: "settings:zeptoMailApiKey"
} as const;

export const STATE_KEYS = {
  runtimeError: "state:lastRuntimeError",
  runtimeErrorExpiresAt: "state:lastRuntimeErrorExpiresAt"
} as const;

export const FORBIDDEN_FIELD_NAMES = new Set([
  "recipient",
  "recipients",
  "sender",
  "from",
  "to",
  "cc",
  "bcc",
  "replyto",
  "reply-to",
  "reply_to",
  "subject"
]);

export const TOP_LEVEL_SUBMISSION_KEYS = new Set([
  "formName",
  "site",
  "fields",
  "turnstileToken",
  "honeypot"
]);
