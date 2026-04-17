import { SUBMISSION_ID_HEADER } from "../constants.js";
import { buildAuthorCreditBlocks } from "./author-credit.js";
import type { ConfigHealthIssue, StoredSettings } from "../types.js";

function bannerBlock(issue: ConfigHealthIssue): Record<string, unknown> {
  return {
    type: "banner",
    variant: issue.variant,
    title: issue.title,
    description: issue.description
  };
}

export function buildSettingsBlocks(input: {
  settings: StoredSettings;
  issues: ConfigHealthIssue[];
  suggestedOrigins: string[];
}): Array<Record<string, unknown>> {
  const { settings, issues, suggestedOrigins } = input;
  const allowedOriginsValue =
    settings.allowedOrigins.length > 0 ? settings.allowedOrigins : suggestedOrigins;

  const blocks: Array<Record<string, unknown>> = [
    {
      type: "header",
      text: "Form Mailer"
    },
    {
      type: "context",
      text: "Reliable contact and lead-form delivery for EmDash. Narrow scope, production-minded defaults."
    },
    ...issues.map(bannerBlock),
    {
      type: "form",
      block_id: "form-mailer-settings",
      fields: [
        {
          type: "select",
          action_id: "provider",
          label: "Provider",
          options: [
            { label: "Cloudflare", value: "cloudflare" },
            { label: "ZeptoMail", value: "zeptomail" }
          ],
          initial_value: settings.provider
        },
        {
          type: "text_input",
          action_id: "senderAddress",
          label: "Sender address",
          initial_value: settings.senderAddress
        },
        {
          type: "text_input",
          action_id: "recipientAddresses",
          label: "Recipient address(es)",
          multiline: true,
          initial_value: settings.recipientAddresses.join("\n")
        },
        {
          type: "text_input",
          action_id: "subjectTemplate",
          label: "Subject template",
          initial_value: settings.subjectTemplate
        },
        {
          type: "text_input",
          action_id: "successMessage",
          label: "Success message",
          multiline: true,
          initial_value: settings.successMessage
        },
        {
          type: "text_input",
          action_id: "allowedOrigins",
          label: "Allowed origins",
          multiline: true,
          initial_value: allowedOriginsValue.join("\n")
        },
        {
          type: "toggle",
          action_id: "turnstileEnabled",
          label: "Enable Turnstile",
          initial_value: settings.turnstileEnabled
        },
        {
          type: "text_input",
          action_id: "turnstileSiteKey",
          label: "Turnstile site key",
          initial_value: settings.turnstileSiteKey
        },
        {
          type: "secret_input",
          action_id: "turnstileSecretKey",
          label: "Turnstile secret key"
        },
        {
          type: "toggle",
          action_id: "honeypotEnabled",
          label: "Enable honeypot",
          initial_value: settings.honeypotEnabled
        },
        {
          type: "text_input",
          action_id: "honeypotFieldName",
          label: "Honeypot field name",
          initial_value: settings.honeypotFieldName
        },
        {
          type: "number_input",
          action_id: "rateLimitPerMinute",
          label: "Rate limit per IP per minute",
          min: 1,
          initial_value: settings.rateLimitPerMinute
        },
        {
          type: "toggle",
          action_id: "strictMode",
          label: "Strict mode",
          initial_value: settings.strictMode
        },
        {
          type: "secret_input",
          action_id: "zeptoMailApiKey",
          label: "ZeptoMail API key"
        }
      ],
      submit: {
        label: "Save settings",
        action_id: "save_settings"
      }
    },
    {
      type: "fields",
      fields: [
        {
          label: "Turnstile secret",
          value: settings.hasTurnstileSecretKey ? "Stored" : "Not stored"
        },
        {
          label: "ZeptoMail API key",
          value: settings.hasZeptoMailApiKey ? "Stored" : "Not stored"
        }
      ]
    },
    {
      type: "context",
      text: "Supported subject tokens: {site}, {formName}"
    },
    {
      type: "context",
      text: "Leave empty to auto-detect this site's origin. Add additional origins for headless deployments where your frontend is on a different domain than your EmDash admin."
    },
    {
      type: "code",
      language: "bash",
      code:
        `curl -X POST https://your-site.example/_emdash/api/plugins/.../submit \\\n` +
        `  -H "Content-Type: application/json" \\\n` +
        `  -H "${SUBMISSION_ID_HEADER}: $(uuidgen)" \\\n` +
        "  -d '{\"formName\":\"Contact\",\"fields\":{\"name\":\"Ada\",\"email\":\"ada@example.com\"}}'"
    },
    ...buildAuthorCreditBlocks()
  ];

  return blocks;
}
