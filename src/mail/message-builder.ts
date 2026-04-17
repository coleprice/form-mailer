import type {
  NormalizedField,
  NormalizedMessage,
  PluginSettings,
  ValidatedSubmission
} from "../types.js";
import { renderNotificationEmail } from "./render/render-notification-email.js";

function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function applyTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

function normalizeFields(fields: Record<string, string>): NormalizedField[] {
  return Object.entries(fields).map(([key, value]) => ({
    key,
    label: humanizeKey(key),
    value
  }));
}

export function buildNormalizedMessage(input: {
  settings: PluginSettings;
  submission: ValidatedSubmission;
  origin: string;
  ip: string;
  submissionId?: string;
}): NormalizedMessage {
  const { settings, submission, origin, ip, submissionId } = input;
  const siteName = submission.site?.trim() || new URL(origin).hostname;
  const fields = normalizeFields(submission.fields);
  const subject = applyTemplate(settings.subjectTemplate, {
    site: siteName,
    formName: submission.formName
  }).trim();
  const rendered = renderNotificationEmail({
    formName: submission.formName,
    siteName,
    origin,
    fields,
    ...(submissionId ? { submissionId } : {})
  });

  return {
    provider: settings.provider,
    formName: submission.formName,
    siteName,
    origin,
    ip,
    from: {
      email: settings.senderAddress
    },
    to: settings.recipientAddresses,
    subject,
    text: rendered.text,
    html: rendered.html,
    fields,
    ...(submissionId ? { submissionId } : {})
  };
}
