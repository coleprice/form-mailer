import {
  FORBIDDEN_FIELD_NAMES,
  MAX_SUBMISSION_BYTES,
  TOP_LEVEL_SUBMISSION_KEYS
} from "../constants.js";
import type { SubmissionBody, ValidatedSubmission } from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.trim().toLowerCase();
}

export function validateSubmissionBody(input: {
  rawBody: string;
  strictMode: boolean;
}): { value?: ValidatedSubmission; errors: string[] } {
  if (input.rawBody.length > MAX_SUBMISSION_BYTES) {
    return { errors: ["Submission payload exceeds the 64KB limit."] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.rawBody);
  } catch {
    return { errors: ["Submission body must be valid JSON."] };
  }

  if (!isRecord(parsed)) {
    return { errors: ["Submission body must be a JSON object."] };
  }

  if (input.strictMode) {
    const unexpectedKeys = Object.keys(parsed).filter((key) => !TOP_LEVEL_SUBMISSION_KEYS.has(key));
    if (unexpectedKeys.length > 0) {
      return {
        errors: [`Unexpected top-level fields: ${unexpectedKeys.join(", ")}.`]
      };
    }
  }

  const formName = typeof parsed.formName === "string" ? parsed.formName.trim() : "";
  const site = typeof parsed.site === "string" ? parsed.site.trim() : undefined;
  const turnstileToken =
    typeof parsed.turnstileToken === "string" ? parsed.turnstileToken.trim() : undefined;
  const honeypot = typeof parsed.honeypot === "string" ? parsed.honeypot : undefined;
  const rawFields = parsed.fields;

  if (formName.length === 0) {
    return { errors: ["formName is required."] };
  }

  if (!isRecord(rawFields)) {
    return { errors: ["fields must be a JSON object of string values."] };
  }

  const fields: Record<string, string> = {};
  const errors: string[] = [];
  for (const [key, value] of Object.entries(rawFields)) {
    const normalizedKey = normalizeFieldName(key);
    if (FORBIDDEN_FIELD_NAMES.has(normalizedKey)) {
      errors.push(`Field "${key}" is not allowed.`);
      continue;
    }

    if (typeof value !== "string") {
      errors.push(`Field "${key}" must be a string.`);
      continue;
    }

    const trimmedKey = key.trim();
    if (!trimmedKey) {
      errors.push("Field names cannot be empty.");
      continue;
    }

    fields[trimmedKey] = value.trim();
  }

  if (Object.keys(fields).length === 0) {
    errors.push("At least one field is required.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    value: {
      formName,
      fields,
      ...(site ? { site } : {}),
      ...(turnstileToken ? { turnstileToken } : {}),
      ...(honeypot !== undefined ? { honeypot } : {})
    } satisfies SubmissionBody,
    errors: []
  };
}
