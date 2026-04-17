import { sanitizeDisplayText } from "../mail/render/escape-html.js";
import type {
  ConfigHealthIssue,
  PluginContextLike,
  StoredRuntimeError,
  StoredSettings
} from "../types.js";

export function getConfigHealthIssues(
  ctx: PluginContextLike,
  settings: StoredSettings,
  runtimeError?: StoredRuntimeError
): ConfigHealthIssue[] {
  const issues: ConfigHealthIssue[] = [];

  if (settings.provider === "cloudflare" && !ctx.email) {
    issues.push({
      variant: "error",
      title: "Cloudflare binding missing",
      description:
        "Cloudflare provider is selected, but the host EmDash Worker does not expose an email binding to this plugin. Add the host site's send_email binding and email pipeline configuration."
    });
  }

  if (settings.provider === "zeptomail" && !settings.hasZeptoMailApiKey) {
    issues.push({
      variant: "error",
      title: "ZeptoMail API key missing",
      description:
        "ZeptoMail provider is selected, but no ZeptoMail API key has been stored yet."
    });
  }

  if (settings.turnstileEnabled && !settings.turnstileSiteKey) {
    issues.push({
      variant: "alert",
      title: "Turnstile site key missing",
      description: "Turnstile is enabled, but no public site key is configured."
    });
  }

  if (settings.turnstileEnabled && !settings.hasTurnstileSecretKey) {
    issues.push({
      variant: "alert",
      title: "Turnstile secret key missing",
      description: "Turnstile is enabled, but no secret key has been stored yet."
    });
  }

  if (runtimeError) {
    issues.push({
      variant: "error",
      title: "Last delivery failure",
      description: sanitizeDisplayText(
        `${runtimeError.errorType}: ${runtimeError.errorMessage}`
      )
    });
  }

  return issues;
}

