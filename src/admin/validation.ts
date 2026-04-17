import type {
  ParsedSettingsForm,
  SettingsFormValues,
  StoredSettings
} from "../types.js";
import {
  DEFAULT_HONEYPOT_FIELD_NAME,
  DEFAULT_RATE_LIMIT_PER_MINUTE,
  DEFAULT_SUBJECT_TEMPLATE,
  DEFAULT_SUCCESS_MESSAGE
} from "../constants.js";
import {
  isValidEmail,
  isValidOrigin,
  parseEmailList,
  parseOriginList,
  stringifyEmailList,
  stringifyOriginList
} from "../settings.js";

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function parseSettingsForm(
  values: SettingsFormValues,
  stored: StoredSettings,
  suggestedOrigins: string[]
): { value?: ParsedSettingsForm; errors: string[] } {
  const providerRaw = readString(values.provider, stored.provider).trim();
  const senderAddress = readString(values.senderAddress, stored.senderAddress).trim();
  const recipientAddressesText = readString(
    values.recipientAddresses,
    stringifyEmailList(stored.recipientAddresses)
  );
  const subjectTemplate = readString(
    values.subjectTemplate,
    stored.subjectTemplate || DEFAULT_SUBJECT_TEMPLATE
  ).trim();
  const successMessage = readString(
    values.successMessage,
    stored.successMessage || DEFAULT_SUCCESS_MESSAGE
  ).trim();
  const fallbackOrigins = stored.allowedOrigins.length > 0 ? stored.allowedOrigins : suggestedOrigins;
  const allowedOriginsText = readString(
    values.allowedOrigins,
    stringifyOriginList(fallbackOrigins)
  );
  const turnstileSiteKey = readString(values.turnstileSiteKey, stored.turnstileSiteKey).trim();
  const turnstileSecretKey = readString(values.turnstileSecretKey).trim();
  const honeypotFieldName = readString(
    values.honeypotFieldName,
    stored.honeypotFieldName || DEFAULT_HONEYPOT_FIELD_NAME
  ).trim();
  const rateLimitPerMinute = readNumber(
    values.rateLimitPerMinute,
    stored.rateLimitPerMinute || DEFAULT_RATE_LIMIT_PER_MINUTE
  );
  const turnstileEnabled = readBoolean(values.turnstileEnabled, stored.turnstileEnabled);
  const honeypotEnabled = readBoolean(values.honeypotEnabled, stored.honeypotEnabled);
  const strictMode = readBoolean(values.strictMode, stored.strictMode);
  const zeptoMailApiKey = readString(values.zeptoMailApiKey).trim();

  const errors: string[] = [];
  if (providerRaw !== "cloudflare" && providerRaw !== "zeptomail") {
    errors.push("Provider must be either cloudflare or zeptomail.");
  }

  if (!isValidEmail(senderAddress)) {
    errors.push("Sender address must be a valid email address.");
  }

  const recipientAddresses = parseEmailList(recipientAddressesText);
  if (recipientAddresses.length === 0) {
    errors.push("At least one recipient address is required.");
  } else if (!recipientAddresses.every(isValidEmail)) {
    errors.push("Recipient addresses must all be valid email addresses.");
  }

  const rawOriginLines = allowedOriginsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!rawOriginLines.every(isValidOrigin)) {
    errors.push("Allowed origins must be valid origins, one per line.");
  }
  const allowedOrigins = rawOriginLines.length > 0 ? parseOriginList(allowedOriginsText) : [];

  if (subjectTemplate.length === 0) {
    errors.push("Subject template is required.");
  }

  if (successMessage.length === 0) {
    errors.push("Success message is required.");
  }

  if (honeypotFieldName.length === 0) {
    errors.push("Honeypot field name is required.");
  }

  if (!Number.isInteger(rateLimitPerMinute) || rateLimitPerMinute < 1) {
    errors.push("Rate limit per IP must be an integer greater than or equal to 1.");
  }

  if (turnstileEnabled && turnstileSiteKey.length === 0) {
    errors.push("Turnstile site key is required when Turnstile is enabled.");
  }

  if (turnstileEnabled && !stored.hasTurnstileSecretKey && turnstileSecretKey.length === 0) {
    errors.push("Turnstile secret key is required when Turnstile is enabled.");
  }

  if (providerRaw === "zeptomail" && !stored.hasZeptoMailApiKey && zeptoMailApiKey.length === 0) {
    errors.push("ZeptoMail API key is required when the ZeptoMail provider is selected.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  const provider = providerRaw === "zeptomail" ? "zeptomail" : "cloudflare";

  return {
    value: {
      provider,
      senderAddress,
      recipientAddresses,
      recipientAddressesText,
      subjectTemplate,
      successMessage,
      allowedOrigins,
      allowedOriginsText,
      turnstileSiteKey,
      honeypotFieldName,
      rateLimitPerMinute,
      turnstileEnabled,
      honeypotEnabled,
      strictMode,
      ...(turnstileSecretKey ? { turnstileSecretKey } : {}),
      ...(zeptoMailApiKey ? { zeptoMailApiKey } : {})
    },
    errors: []
  };
}
