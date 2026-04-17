import type { NormalizedField } from "../../types.js";
import { html, rawHtml, withLineBreaks } from "./escape-html.js";

function renderTextFields(fields: NormalizedField[]): string {
  return fields.map((field) => `${field.label}: ${field.value}`).join("\n");
}

function renderHtmlRows(fields: NormalizedField[]): string {
  const rows = fields.map((field) => {
    return html`<tr>
      <td style="padding:8px 12px;font-weight:600;vertical-align:top;">${field.label}</td>
      <td style="padding:8px 12px;">${withLineBreaks(field.value)}</td>
    </tr>`;
  });

  return rows.join("");
}

export function renderNotificationEmail(input: {
  formName: string;
  siteName: string;
  origin: string;
  fields: NormalizedField[];
  submissionId?: string;
}): { text: string; html: string } {
  const text = [
    `New ${input.formName} submission`,
    "",
    `Site: ${input.siteName}`,
    `Origin: ${input.origin}`,
    input.submissionId ? `Submission ID: ${input.submissionId}` : undefined,
    "",
    renderTextFields(input.fields)
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = html`<!doctype html>
    <html>
      <body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;background:#f8fafc;padding:24px;">
        <table style="max-width:680px;width:100%;margin:0 auto;background:#ffffff;border-collapse:collapse;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
              <h1 style="margin:0 0 8px;font-size:22px;">${input.formName}</h1>
              <p style="margin:0;color:#4b5563;">${input.siteName} • ${input.origin}</p>
              ${input.submissionId
                ? rawHtml(
                    html`<p style="margin:8px 0 0;color:#6b7280;">Submission ID: ${input.submissionId}</p>`
                  )
                : rawHtml("")}
            </td>
          </tr>
          ${rawHtml(renderHtmlRows(input.fields))}
        </table>
      </body>
    </html>`;

  return { text, html: htmlBody };
}

