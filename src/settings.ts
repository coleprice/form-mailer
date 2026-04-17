import {
  DEFAULT_HONEYPOT_FIELD_NAME,
  DEFAULT_RATE_LIMIT_PER_MINUTE,
  DEFAULT_SUBJECT_TEMPLATE,
  DEFAULT_SUCCESS_MESSAGE,
  SETTINGS_KEYS,
  STATE_KEYS
} from "./constants.js";
import type {
  ParsedSettingsForm,
  PluginContextLike,
  PluginSettings,
  ProviderId,
  StoredRuntimeError,
  StoredSettings
} from "./types.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidOrigin(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "https:" || url.protocol === "http:") && url.origin === value.trim();
  } catch {
    return false;
  }
}

export function parseEmailList(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((part) => normalizeEmail(part))
    .filter(Boolean);
}

export function stringifyEmailList(input: string[]): string {
  return input.join("\n");
}

export function parseOriginList(input: string): string[] {
  return normalizeLines(input).map((line) => new URL(line).origin);
}

export function stringifyOriginList(input: string[]): string {
  return input.join("\n");
}

export async function seedDefaultSettings(ctx: PluginContextLike): Promise<void> {
  const existingProvider = await ctx.kv.get<ProviderId>(SETTINGS_KEYS.provider);
  if (!existingProvider) {
    await ctx.kv.set(SETTINGS_KEYS.provider, "cloudflare");
  }

  const existingSubjectTemplate = await ctx.kv.get<string>(SETTINGS_KEYS.subjectTemplate);
  if (!existingSubjectTemplate) {
    await ctx.kv.set(SETTINGS_KEYS.subjectTemplate, DEFAULT_SUBJECT_TEMPLATE);
  }

  const existingSuccessMessage = await ctx.kv.get<string>(SETTINGS_KEYS.successMessage);
  if (!existingSuccessMessage) {
    await ctx.kv.set(SETTINGS_KEYS.successMessage, DEFAULT_SUCCESS_MESSAGE);
  }

  const existingAllowedOrigins = await ctx.kv.get<string[]>(SETTINGS_KEYS.allowedOrigins);
  if (!existingAllowedOrigins) {
    await ctx.kv.set(SETTINGS_KEYS.allowedOrigins, []);
  }

  const existingHoneypotFieldName = await ctx.kv.get<string>(SETTINGS_KEYS.honeypotFieldName);
  if (!existingHoneypotFieldName) {
    await ctx.kv.set(SETTINGS_KEYS.honeypotFieldName, DEFAULT_HONEYPOT_FIELD_NAME);
  }

  const existingRateLimit = await ctx.kv.get<number>(SETTINGS_KEYS.rateLimitPerMinute);
  if (!existingRateLimit) {
    await ctx.kv.set(SETTINGS_KEYS.rateLimitPerMinute, DEFAULT_RATE_LIMIT_PER_MINUTE);
  }

  const existingTurnstileEnabled = await ctx.kv.get<boolean>(SETTINGS_KEYS.turnstileEnabled);
  if (existingTurnstileEnabled === undefined) {
    await ctx.kv.set(SETTINGS_KEYS.turnstileEnabled, false);
  }

  const existingHoneypotEnabled = await ctx.kv.get<boolean>(SETTINGS_KEYS.honeypotEnabled);
  if (existingHoneypotEnabled === undefined) {
    await ctx.kv.set(SETTINGS_KEYS.honeypotEnabled, true);
  }

  const existingStrictMode = await ctx.kv.get<boolean>(SETTINGS_KEYS.strictMode);
  if (existingStrictMode === undefined) {
    await ctx.kv.set(SETTINGS_KEYS.strictMode, true);
  }
}

export async function getSettings(ctx: PluginContextLike): Promise<PluginSettings> {
  const provider = (await ctx.kv.get<ProviderId>(SETTINGS_KEYS.provider)) ?? "cloudflare";
  const senderAddress = (await ctx.kv.get<string>(SETTINGS_KEYS.senderAddress)) ?? "";
  const recipientAddresses =
    (await ctx.kv.get<string[]>(SETTINGS_KEYS.recipientAddresses)) ?? [];
  const subjectTemplate =
    (await ctx.kv.get<string>(SETTINGS_KEYS.subjectTemplate)) ?? DEFAULT_SUBJECT_TEMPLATE;
  const successMessage =
    (await ctx.kv.get<string>(SETTINGS_KEYS.successMessage)) ?? DEFAULT_SUCCESS_MESSAGE;
  const allowedOrigins =
    (await ctx.kv.get<string[]>(SETTINGS_KEYS.allowedOrigins)) ?? [];
  const turnstileSiteKey =
    (await ctx.kv.get<string>(SETTINGS_KEYS.turnstileSiteKey)) ?? "";
  const turnstileSecretKey = await ctx.kv.get<string>(SETTINGS_KEYS.turnstileSecretKey);
  const honeypotFieldName =
    (await ctx.kv.get<string>(SETTINGS_KEYS.honeypotFieldName)) ??
    DEFAULT_HONEYPOT_FIELD_NAME;
  const rateLimitPerMinute =
    (await ctx.kv.get<number>(SETTINGS_KEYS.rateLimitPerMinute)) ??
    DEFAULT_RATE_LIMIT_PER_MINUTE;
  const turnstileEnabled =
    (await ctx.kv.get<boolean>(SETTINGS_KEYS.turnstileEnabled)) ?? false;
  const honeypotEnabled =
    (await ctx.kv.get<boolean>(SETTINGS_KEYS.honeypotEnabled)) ?? true;
  const strictMode = (await ctx.kv.get<boolean>(SETTINGS_KEYS.strictMode)) ?? true;
  const zeptoMailApiKey = await ctx.kv.get<string>(SETTINGS_KEYS.zeptoMailApiKey);

  return {
    provider,
    senderAddress,
    recipientAddresses,
    subjectTemplate,
    successMessage,
    allowedOrigins,
    turnstileSiteKey,
    honeypotFieldName,
    rateLimitPerMinute,
    turnstileEnabled,
    honeypotEnabled,
    strictMode,
    ...(turnstileSecretKey ? { turnstileSecretKey } : {}),
    ...(zeptoMailApiKey ? { zeptoMailApiKey } : {})
  };
}

export async function getStoredSettings(ctx: PluginContextLike): Promise<StoredSettings> {
  const settings = await getSettings(ctx);

  return {
    provider: settings.provider,
    senderAddress: settings.senderAddress,
    recipientAddresses: settings.recipientAddresses,
    subjectTemplate: settings.subjectTemplate,
    successMessage: settings.successMessage,
    allowedOrigins: settings.allowedOrigins,
    turnstileSiteKey: settings.turnstileSiteKey,
    honeypotFieldName: settings.honeypotFieldName,
    rateLimitPerMinute: settings.rateLimitPerMinute,
    turnstileEnabled: settings.turnstileEnabled,
    honeypotEnabled: settings.honeypotEnabled,
    strictMode: settings.strictMode,
    hasTurnstileSecretKey: Boolean(settings.turnstileSecretKey),
    hasZeptoMailApiKey: Boolean(settings.zeptoMailApiKey)
  };
}

export async function saveSettings(
  ctx: PluginContextLike,
  values: ParsedSettingsForm
): Promise<void> {
  await ctx.kv.set(SETTINGS_KEYS.provider, values.provider);
  await ctx.kv.set(SETTINGS_KEYS.senderAddress, normalizeEmail(values.senderAddress));
  await ctx.kv.set(SETTINGS_KEYS.recipientAddresses, values.recipientAddresses);
  await ctx.kv.set(SETTINGS_KEYS.subjectTemplate, values.subjectTemplate.trim());
  await ctx.kv.set(SETTINGS_KEYS.successMessage, values.successMessage.trim());
  await ctx.kv.set(SETTINGS_KEYS.allowedOrigins, values.allowedOrigins);
  await ctx.kv.set(SETTINGS_KEYS.turnstileSiteKey, values.turnstileSiteKey.trim());
  await ctx.kv.set(SETTINGS_KEYS.honeypotFieldName, values.honeypotFieldName.trim());
  await ctx.kv.set(SETTINGS_KEYS.rateLimitPerMinute, values.rateLimitPerMinute);
  await ctx.kv.set(SETTINGS_KEYS.turnstileEnabled, values.turnstileEnabled);
  await ctx.kv.set(SETTINGS_KEYS.honeypotEnabled, values.honeypotEnabled);
  await ctx.kv.set(SETTINGS_KEYS.strictMode, values.strictMode);

  if (values.turnstileSecretKey) {
    await ctx.kv.set(SETTINGS_KEYS.turnstileSecretKey, values.turnstileSecretKey);
  }

  if (values.zeptoMailApiKey) {
    await ctx.kv.set(SETTINGS_KEYS.zeptoMailApiKey, values.zeptoMailApiKey);
  }
}

export function getSuggestedOrigin(request: Request, storedOrigins: string[]): string[] {
  if (storedOrigins.length > 0) {
    return storedOrigins;
  }

  try {
    return [new URL(request.url).origin];
  } catch {
    return [];
  }
}

export function clearRuntimeErrorIfExpired(
  error: StoredRuntimeError | undefined,
  now: Date
): StoredRuntimeError | undefined {
  if (!error) {
    return undefined;
  }

  if (Date.parse(error.expiresAt) <= now.getTime()) {
    return undefined;
  }

  return error;
}

export async function getRuntimeError(
  ctx: PluginContextLike,
  now: Date
): Promise<StoredRuntimeError | undefined> {
  const expiresAt = await ctx.kv.get<string>(STATE_KEYS.runtimeErrorExpiresAt);
  if (expiresAt && Date.parse(expiresAt) <= now.getTime()) {
    await clearRuntimeError(ctx);
    return undefined;
  }

  const error = await ctx.kv.get<StoredRuntimeError>(STATE_KEYS.runtimeError);
  if (!error) {
    return undefined;
  }

  const liveError = clearRuntimeErrorIfExpired(error, now);
  if (!liveError) {
    await clearRuntimeError(ctx);
  }
  return liveError;
}

export async function storeRuntimeError(
  ctx: PluginContextLike,
  error: StoredRuntimeError
): Promise<void> {
  await ctx.kv.set(STATE_KEYS.runtimeError, error);
  await ctx.kv.set(STATE_KEYS.runtimeErrorExpiresAt, error.expiresAt);
}

export async function clearRuntimeError(ctx: PluginContextLike): Promise<void> {
  await ctx.kv.delete(STATE_KEYS.runtimeError);
  await ctx.kv.delete(STATE_KEYS.runtimeErrorExpiresAt);
}
