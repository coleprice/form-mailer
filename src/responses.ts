import type { SubmissionResponse, SubmissionStatus, ValidationResponse } from "./types.js";

export function successResponse(message: string): SubmissionResponse {
  return {
    status: "success",
    message
  };
}

export function errorResponse(
  status: Exclude<SubmissionStatus, "success">,
  message: string
): SubmissionResponse {
  return { status, message };
}

export function validationResponse(
  message: string,
  errors: string[]
): ValidationResponse {
  return {
    status: "validation_error",
    message,
    errors
  };
}

export function jsonError(statusCode: number, body: SubmissionResponse | ValidationResponse): never {
  throw new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
