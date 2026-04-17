# @coleprice/emdash-plugin-form-mailer

`@coleprice/emdash-plugin-form-mailer` is a small, opinionated EmDash plugin for reliable contact and lead-form delivery. It keeps scope intentionally narrow: accept a validated public form submission, apply anti-spam controls, and send notification email through either Cloudflare Email Service or ZeptoMail.

It is built as a Standard-format EmDash plugin with a public `submit` route, Block Kit admin settings, structured logging, and a queue-ready delivery boundary that stays synchronous in v0.1.

## Capabilities

- `email:send`
  Uses `ctx.email.send()` for the Cloudflare Email Service provider.
- `network:fetch`
  Used for Cloudflare Turnstile verification and ZeptoMail API delivery.

Allowed hosts are intentionally narrow:

- `challenges.cloudflare.com`
- `api.zeptomail.com`

## Installation

### Marketplace install

1. Install `@coleprice/emdash-plugin-form-mailer` from the EmDash marketplace.
2. Enable the plugin in your EmDash site.
3. Open the plugin settings page at `Form Mailer`.
4. Save your sender, recipients, allowed origins, and provider configuration.

### Dev-mode local install

1. Add the package to your EmDash project.
2. Register it in your EmDash config.

```ts
import { defineConfig } from "emdash";
import { formMailerPlugin } from "@coleprice/emdash-plugin-form-mailer";

export default defineConfig({
  plugins: [formMailerPlugin()]
});
```

3. Build the plugin with `npm run build`.
4. Start your EmDash site in development mode with the host site configured for whichever provider you want to exercise.

## Settings Walkthrough

- `Provider`
  `cloudflare` or `zeptomail`. Cloudflare is the default.
- `Sender address`
  The verified sender address used for all outgoing notifications.
- `Recipient address(es)`
  One or more addresses, one per line.
- `Subject template`
  Supports `{site}` and `{formName}`.
- `Success message`
  Returned to the submitter after a successful send.
- `Allowed origins`
  One origin per line. If empty, the admin page pre-fills the current admin origin as a suggested value you can save or override.
- `Turnstile site key`
  Public site key.
- `Turnstile secret key`
  One-way write only. Stored and never rendered back.
- `ZeptoMail API key`
  One-way write only. Stored and never rendered back.
- `Honeypot field name`
  Defaults to `website`.
- `Rate limit per IP per minute`
  Defaults to `10`.
- `Enable Turnstile`
  Enables backend verification through Cloudflare Turnstile.
- `Enable honeypot`
  Enabled by default.
- `Strict mode`
  Rejects unexpected top-level payload keys.

The admin page also includes an author-credit footer and a reusable “Get help” section.

## Cloudflare Email Service

### What this plugin expects

The Cloudflare provider uses EmDash’s `ctx.email.send()` capability. That means the actual `send_email` binding is configured on the **host EmDash site**, not inside the published plugin bundle.

### Host site Wrangler config

Cloudflare’s current Email Service Workers binding uses a `send_email` array with a `name` field. For local development, Cloudflare documents `remote: true`.

Minimal host-site example:

```jsonc
{
  "send_email": [
    {
      "name": "EMAIL",
      "remote": true
    }
  ]
}
```

Important:

- The `wrangler.jsonc` in this plugin repo is for local development scaffolding only.
- Production binding configuration belongs in the host EmDash site’s Wrangler config.
- The sender domain must be verified in Cloudflare Email Service before real sends will succeed.

### Local development story

For Cloudflare provider testing locally:

1. Configure the host EmDash site with a `send_email` binding.
2. Run the host site locally.
3. Use this plugin with provider `cloudflare`.

If you want a simpler path that does not depend on a host-site binding during early development, use provider `zeptomail` and a fake or dev-only API key in the admin UI. The test suite never calls the real API.

## ZeptoMail

ZeptoMail support is explicit and opt-in. The plugin will not silently fall back between providers.

Configuration notes:

- Enter the API key in the admin UI.
- Verify your sender domain in ZeptoMail first.
- The plugin only fetches `https://api.zeptomail.com`.

## Usage Example

This plugin does not ship a runtime-mounted Astro component. Instead, use the documented public API and adapt your theme or frontend to it.

See [examples/contact-form.astro](./examples/contact-form.astro) for a complete example.

Minimal fetch example:

```ts
const submissionId = crypto.randomUUID();

await fetch("/_emdash/api/plugins/@coleprice/emdash-plugin-form-mailer/submit", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Submission-Id": submissionId
  },
  body: JSON.stringify({
    formName: "Contact",
    site: "coleprice.com",
    fields: {
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "Hello from the site."
    },
    turnstileToken: "token-from-widget",
    honeypot: ""
  })
});
```

## POST API Contract

This is the semver-committed public API for theme and frontend integrations.

### Endpoint

`POST /_emdash/api/plugins/@coleprice/emdash-plugin-form-mailer/submit`

### Required headers

- `Content-Type: application/json`
- `Origin: https://your-frontend.example`

Optional header:

- `X-Submission-Id: <uuid-v4>`
  Recommended. When present, successful responses are replayed from the idempotency cache for 24 hours without re-sending email.

### Request body

```json
{
  "formName": "Contact",
  "site": "coleprice.com",
  "fields": {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "message": "Hello from the site."
  },
  "turnstileToken": "token-from-widget",
  "honeypot": ""
}
```

Field notes:

- `formName`
  Required string.
- `site`
  Optional string used for subject rendering.
- `fields`
  Required object of string values.
- `turnstileToken`
  Required when Turnstile is enabled.
- `honeypot`
  Optional string. A non-empty value is treated as spam.

Forbidden field names inside `fields`:

- `recipient`
- `recipients`
- `sender`
- `from`
- `to`
- `cc`
- `bcc`
- `replyTo`
- `reply-to`
- `reply_to`
- `subject`

### Response JSON

Success:

```json
{
  "status": "success",
  "message": "Thanks. Your message has been sent successfully."
}
```

Validation error:

```json
{
  "status": "validation_error",
  "message": "Your submission could not be processed.",
  "errors": ["Field \"to\" is not allowed."]
}
```

Other stable response statuses:

- `spam_rejected`
- `send_failed`
- `rate_limited`
- `configuration_error`
- `origin_not_allowed`

### Status codes

- `200`
  Successful send.
- `200`
  Honeypot-triggered spam rejection, returned as a success-shaped response to avoid tipping bots.
- `400`
  Validation failure.
- `403`
  Origin rejected or Turnstile rejection.
- `429`
  Rate-limited.
- `500`
  Configuration problem or provider send failure.

## Security Notes

- All interpolated HTML email content is escaped by default through a tagged-template helper.
- Both plaintext and HTML email bodies are sent.
- Recipient routing always comes from plugin settings, never from submission data.
- Allowed origins are explicit and configurable for headless EmDash deployments.
- Idempotency cache entries store only replay-safe response payloads, not echoed submission values.
- Runtime delivery failures are shown in the admin for 7 days and escaped before display.

## Troubleshooting

### “Cloudflare binding missing”

Cloudflare provider is selected, but the host EmDash Worker does not expose the email binding to plugins. Add the host-site `send_email` binding and restart the site.

### “origin_not_allowed”

The request `Origin` header is missing or does not match the configured allowed origins. Update the `Allowed origins` setting to include the public frontend domain.

### Turnstile failures

Make sure both the site key and secret key are configured, and that your frontend is sending the token as `turnstileToken`.

### ZeptoMail send failures

Check that the API key is stored in the admin UI, that your sender is verified in ZeptoMail, and that outbound calls to `api.zeptomail.com` are allowed by your host environment.

### Cloudflare provider rejects the sender

The sender domain usually needs to be verified in Cloudflare Email Service before delivery will succeed.

### Local dev confusion around `wrangler.jsonc`

The `wrangler.jsonc` in this repo is only scaffolding for local plugin development and worker-based tests. Production binding configuration lives in the host EmDash site’s Wrangler config.

