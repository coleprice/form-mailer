export type ProviderId = "cloudflare" | "zeptomail";

export type SubmissionStatus =
  | "success"
  | "validation_error"
  | "spam_rejected"
  | "send_failed"
  | "rate_limited"
  | "configuration_error"
  | "origin_not_allowed";

export interface SubmissionResponse {
  status: SubmissionStatus;
  message: string;
}

export interface ValidationResponse extends SubmissionResponse {
  errors: string[];
}

export interface SubmissionBody {
  formName: string;
  site?: string;
  fields: Record<string, string>;
  turnstileToken?: string;
  honeypot?: string;
}

export interface ValidatedSubmission {
  formName: string;
  site?: string;
  fields: Record<string, string>;
  turnstileToken?: string;
  honeypot?: string;
}

export interface NormalizedField {
  key: string;
  label: string;
  value: string;
}

export interface NormalizedMessage {
  provider: ProviderId;
  submissionId?: string;
  formName: string;
  siteName: string;
  origin: string;
  ip: string;
  from: {
    email: string;
    name?: string;
  };
  to: string[];
  subject: string;
  text: string;
  html: string;
  fields: NormalizedField[];
}

export interface SendResult {
  ok: boolean;
  provider: ProviderId;
  messageId?: string;
  errorType?: string;
  errorMessage?: string;
}

export interface MailProvider {
  send(message: NormalizedMessage): Promise<SendResult>;
}

export interface StoredIdempotencyRecord {
  expiresAt: string;
  response: SubmissionResponse;
}

export interface StoredRateLimitRecord {
  count: number;
  expiresAt: string;
}

export interface StoredRuntimeError {
  provider: ProviderId;
  errorType: string;
  errorMessage: string;
  submissionId?: string;
  createdAt: string;
  expiresAt: string;
}

export interface PluginSettings {
  provider: ProviderId;
  senderAddress: string;
  recipientAddresses: string[];
  subjectTemplate: string;
  successMessage: string;
  allowedOrigins: string[];
  turnstileSiteKey: string;
  turnstileSecretKey?: string;
  honeypotFieldName: string;
  rateLimitPerMinute: number;
  turnstileEnabled: boolean;
  honeypotEnabled: boolean;
  strictMode: boolean;
  zeptoMailApiKey?: string;
}

export interface StoredSettings {
  provider: ProviderId;
  senderAddress: string;
  recipientAddresses: string[];
  subjectTemplate: string;
  successMessage: string;
  allowedOrigins: string[];
  turnstileSiteKey: string;
  honeypotFieldName: string;
  rateLimitPerMinute: number;
  turnstileEnabled: boolean;
  honeypotEnabled: boolean;
  strictMode: boolean;
  hasTurnstileSecretKey: boolean;
  hasZeptoMailApiKey: boolean;
}

export interface SettingsFormValues {
  provider?: unknown;
  senderAddress?: unknown;
  recipientAddresses?: unknown;
  subjectTemplate?: unknown;
  successMessage?: unknown;
  allowedOrigins?: unknown;
  turnstileSiteKey?: unknown;
  turnstileSecretKey?: unknown;
  honeypotFieldName?: unknown;
  rateLimitPerMinute?: unknown;
  turnstileEnabled?: unknown;
  honeypotEnabled?: unknown;
  strictMode?: unknown;
  zeptoMailApiKey?: unknown;
}

export interface ParsedSettingsForm {
  provider: ProviderId;
  senderAddress: string;
  recipientAddresses: string[];
  recipientAddressesText: string;
  subjectTemplate: string;
  successMessage: string;
  allowedOrigins: string[];
  allowedOriginsText: string;
  turnstileSiteKey: string;
  turnstileSecretKey?: string;
  honeypotFieldName: string;
  rateLimitPerMinute: number;
  turnstileEnabled: boolean;
  honeypotEnabled: boolean;
  strictMode: boolean;
  zeptoMailApiKey?: string;
}

export interface ConfigHealthIssue {
  variant: "default" | "alert" | "error";
  title: string;
  description: string;
}

export interface RouteContextLike {
  request: Request;
  input?: unknown;
}

export interface KVEntryLike<T = unknown> {
  key: string;
  value: T;
}

export interface KVLike {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<unknown>;
  delete(key: string): Promise<unknown>;
  list(prefix?: string): Promise<Array<KVEntryLike>>;
}

export interface LogLike {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export interface HttpLike {
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

export interface EmailLike {
  send(message: {
    to: string | string[];
    from: string | { email: string; name?: string };
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string | { email: string; name?: string };
    headers?: Record<string, string>;
  }): Promise<{ messageId?: string }>;
}

export interface PluginContextLike {
  plugin: {
    id: string;
    version: string;
  };
  kv: KVLike;
  log: LogLike;
  http?: HttpLike;
  email?: EmailLike;
}

export interface SubmitRouteDependencies {
  now?: () => Date;
  deliver?: (
    ctx: PluginContextLike,
    settings: PluginSettings,
    message: NormalizedMessage
  ) => Promise<SendResult>;
}

