# BUILD-PLAN

## Scope

Build `@coleprice/emdash-plugin-form-mailer` as a **Standard-format EmDash plugin** with:

- a public POST submission route
- Block Kit admin settings UI
- explicit provider selection between Cloudflare Email Service and ZeptoMail
- Turnstile, honeypot, rate limiting, idempotency, and structured logging
- synchronous delivery in v1, with queue-ready service boundaries

This document is the pre-implementation plan only. No implementation should start until it is approved.

## Verified source notes

### What to preserve from `/Users/cole/Code/zeptoworker`

- Keep the narrow product shape: one public POST endpoint, submitter-facing JSON result, email notification delivery only.
- Keep origin-aware request handling as a security concept.
- Keep Turnstile verification against `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
- Keep the idea of provider-specific email formatting and subject prefixing.

### What to modernize from `/Users/cole/Code/zeptoworker`

- Replace direct `fetch()` with EmDash-compatible `ctx.http.fetch()` for sandbox safety.
- Replace raw HTML interpolation with an escaping tagged-template helper.
- Add plaintext body alongside HTML.
- Remove hardcoded routing/BCC behavior and move all routing into validated settings.
- Add strict payload validation, honeypot, rate limit, idempotency, and structured logs.
- Split delivery into a provider layer plus `MailService` instead of route-owned send logic.

## Verified doc constraints

### EmDash plugin model

Verified from the EmDash `creating-plugins` skill and references:

- Standard plugins use `src/index.ts` for the descriptor and `src/sandbox-entry.ts` for `definePlugin()` runtime logic.
- Sandboxed plugins must avoid Node.js built-ins and use declared capabilities.
- `network:fetch` enables `ctx.http.fetch()` with `allowedHosts`.
- `email:send` enables `ctx.email.send()`.
- `ctx.kv` and plugin-scoped storage are available without extra capability declarations.
- Sandboxed admin UI uses Block Kit JSON, not React.

### First-party plugin reality check

Inspected actual first-party plugins under `emdash-cms/emdash/packages/plugins` before implementation planning:

- `forms` is **not** using the modern standard split described in the skill.
  - `package.json` exports `.` plus `./admin` and `./astro`, but not `./sandbox`.
  - `src/index.ts` defines `formsPlugin()` plus inline `createPlugin()` and uses `adminEntry` and `componentsEntry`.
  - `forms` does declare public routes such as `submit` and `definition`, but it does so from that inline, trusted/native-style plugin shape.
- Confirmed standard-format first-party plugins include:
  - `webhook-notifier`
  - `sandboxed-test`
  - `marketplace-test`
  - `audit-log`
  - `atproto`
- In the standard plugin source I inspected, I did **not** find any `public: true` route declarations.
  - `webhook-notifier` has routes, but they are admin/internal route handlers and helper endpoints.
  - `sandboxed-test`, `marketplace-test`, `audit-log`, and `atproto` also have routes, but none were marked public in the inspected source.

Planning conclusion from repo evidence:

- The repo evidence does **not** give us a first-party example of a marketplace-style standard plugin exposing a public route.
- The only first-party plugin I found that clearly uses public routes is `forms`, and it is not following the standard descriptor-plus-`./sandbox` pattern we were asked to target.
- That means the publishing reference warning about routes requiring trusted mode now carries more weight than the skill example alone.

### Cloudflare Email Service beta

Verified from current Cloudflare docs dated April 16, 2026:

- Wrangler config uses a `send_email` binding array.
- The binding entry uses `name`, not `binding`.
- Local dev can use `remote: true`.
- Runtime send API is `await env.EMAIL.send(message)` where `message` can be a structured builder object.
- Recommended structured message fields include `to`, `from`, `subject`, `text`, `html`, optional `cc`, `bcc`, `replyTo`, `attachments`, and `headers`.

Important implementation note:

- Inside a sandboxed EmDash plugin we should plan around `ctx.email.send()`, not raw `env.EMAIL.send()`, because the plugin runtime is mediated through EmDash capabilities. The Cloudflare binding docs still matter for host setup, local dev guidance, and configuration diagnostics.

## Proposed file and directory layout

```text
form-mailer/
├── BUILD-PLAN.md
├── LICENSE
├── README.md
├── TODO-v2.md
├── examples/
│   └── contact-form.astro
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── wrangler.jsonc
└── src/
    ├── index.ts
    ├── sandbox-entry.ts
    ├── constants.ts
    ├── types.ts
    ├── settings.ts
    ├── responses.ts
    ├── admin/
    │   ├── blocks.ts
    │   ├── config-health.ts
    │   └── validation.ts
    ├── mail/
    │   ├── mail-service.ts
    │   ├── provider-factory.ts
    │   ├── message-builder.ts
    │   ├── providers/
    │   │   ├── cloudflare-email-provider.ts
    │   │   └── zeptomail-provider.ts
    │   └── render/
    │       ├── escape-html.ts
    │       └── render-notification-email.ts
    ├── security/
    │   ├── honeypot.ts
    │   ├── idempotency.ts
    │   ├── rate-limit.ts
    │   ├── turnstile.ts
    │   └── validate-submission.ts
    └── routes/
        ├── admin.ts
        └── submit.ts
```

Notes:

- No plugin storage collections are planned for v1. KV is enough for settings, rate-limit counters, idempotency cache, and lightweight runtime notices.
- `examples/contact-form.astro` is planned as a consumer-side integration example, not a runtime-loaded plugin component.

## Descriptor and capability manifest

Planned descriptor shape:

```ts
{
  id: "@coleprice/emdash-plugin-form-mailer",
  version: "0.1.0",
  format: "standard",
  entrypoint: "@coleprice/emdash-plugin-form-mailer/sandbox",
  capabilities: ["email:send", "network:fetch"],
  allowedHosts: ["challenges.cloudflare.com", "api.zeptomail.com"],
  adminPages: [
    { path: "/settings", label: "Form Mailer", icon: "mail" }
  ]
}
```

Why only these capabilities:

- `email:send`: Cloudflare provider path via `ctx.email.send()`
- `network:fetch`: Turnstile verification and ZeptoMail API calls

Not requested on purpose:

- `read:content`
- `write:content`
- `read:media`
- `write:media`
- `read:users`

## Provider interface shape

Planned transport contract:

```ts
export type MailProviderId = "cloudflare" | "zeptomail";

export interface NormalizedMessage {
  provider: MailProviderId;
  submissionId?: string;
  formName: string;
  siteName?: string;
  origin?: string;
  ip?: string;
  from: {
    email: string;
    name?: string;
  };
  to: string[];
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  fields: Array<{
    key: string;
    label: string;
    value: string;
  }>;
}

export interface SendResult {
  ok: boolean;
  provider: MailProviderId;
  messageId?: string;
  errorType?: string;
  errorMessage?: string;
}

export interface MailProvider {
  send(message: NormalizedMessage): Promise<SendResult>;
}
```

Planned responsibility split:

- `message-builder.ts` normalizes validated submission input into `NormalizedMessage`.
- Providers only translate `NormalizedMessage` into native transport calls.
- `mail-service.ts` owns provider selection, config readiness checks, `enqueue()`, `deliver()`, and structured logging.
- `enqueue()` will call `deliver()` in v1.

## Runtime design

### Submission route

Planned route name:

- `submit`
- Public URL will live under EmDash's plugin route prefix.
- Exact scoped-plugin URL shape will be verified against the router before the README API contract is finalized, because the docs examples only show unscoped IDs.

Planned request handling:

1. Enforce `POST`.
2. Enforce payload cap around 64 KB before parsing.
3. Parse JSON payload.
4. Validate required and optional fields.
5. Reject forbidden mail-routing fields like `to`, `from`, `cc`, `bcc`, `replyTo`, `recipient`, `sender`.
6. Read the `Origin` request header.
7. If `Origin` is missing or empty, reject.
8. Load `settings:allowedOrigins`.
9. If the allowed-origins setting is empty, attempt first-submit auto-detection by storing the current request origin as the initial allowed origin.
10. If auto-detection cannot run yet, fall back gracefully to same-origin-only behavior until an origin is learned or saved by an admin.
11. If the request origin is still not allowed, return `403` with `status: "origin_not_allowed"`.
12. Apply honeypot check.
13. Apply Turnstile verification if enabled.
14. Apply per-IP rate limit in KV using `ratelimit:<ip>:<minute-bucket>`.
15. Apply idempotency lookup with `X-Submission-Id` via `idem:<submission-id>`.
16. Build normalized message.
17. Call `mailService.enqueue(message)`.
18. Cache successful idempotent response for 24h when a submission ID is present.
19. Return stable JSON with a `status` field and user-facing message.

### Settings persistence

Planned KV keys:

- `settings:provider`
- `settings:senderAddress`
- `settings:recipientAddresses`
- `settings:subjectTemplate`
- `settings:successMessage`
- `settings:allowedOrigins`
- `settings:turnstileSiteKey`
- `settings:turnstileSecretKey`
- `settings:honeypotFieldName`
- `settings:rateLimitPerMinute`
- `settings:turnstileEnabled`
- `settings:honeypotEnabled`
- `settings:strictMode`
- `state:lastRuntimeError`

Defaults seeded during install:

- provider: `cloudflare`
- subject template: `[{site}] {formName}`
- success message: concise success copy
- allowed origins: `null` initially, then auto-populated from the first valid request origin when possible
- honeypot field name: `website`
- rate limit: `10`
- turnstile enabled: `false`
- honeypot enabled: `true`
- strict mode: `true`

### Structured logging

Every send attempt or failure will log:

- `provider`
- `from_domain`
- `to_recipient_redacted`
- `error_type`
- `error_message`
- `retry_count`
- `submission_id`

Planned helper behavior:

- `info` for successful sends
- `warn` for validation, honeypot, Turnstile, and rate-limit rejections
- `error` for delivery failures and provider configuration failures

## Admin UI block structure

Single admin page at `/settings`, served through the plugin `admin` route using Block Kit interactions.

### `page_load` response outline

1. `header`
   - “Form Mailer”
2. `context`
   - Short description of the plugin’s narrow purpose
3. Optional `banner`
   - Configuration-time error, such as Cloudflare selected but email pipeline unavailable
4. Optional `banner`
   - Last runtime delivery failure summary from `state:lastRuntimeError`
5. `form`
   - Provider select: `cloudflare | zeptomail`
   - Sender address
   - Recipient addresses
   - Subject template
   - Success message
   - Allowed origins textarea, one origin per line
   - Turnstile enabled toggle
   - Turnstile site key
   - Turnstile secret key as `secret_input`
   - Honeypot enabled toggle
   - Honeypot field name
   - Rate limit per IP per minute
   - Strict mode toggle
6. `context`
   - Token help for `{site}` and `{formName}`
   - Origin help text: "Leave empty to auto-detect this site's origin. Add additional origins for headless deployments where your frontend is on a different domain than your EmDash admin."
7. `code`
   - Minimal API snippet or header example for `X-Submission-Id`

### `form_submit` behavior

- Validate settings server-side.
- Persist only valid settings.
- Return refreshed blocks plus:
  - success `toast` on save
  - error `banner` when validation fails

Validation rules:

- provider must be `cloudflare` or `zeptomail`
- sender must be a valid email address
- recipients must parse into one or more valid email addresses
- allowed origins must parse as zero or more valid origins, one per line
- rate limit must be an integer >= 1
- Turnstile fields required only when Turnstile is enabled
- ZeptoMail-specific secret required only when provider is `zeptomail`

## Queue-readiness decision

Current plan: **inline delivery only in v1**.

Why:

- The EmDash docs reviewed so far expose `ctx.email`, `ctx.http`, `ctx.kv`, `ctx.storage`, and `ctx.cron`, but do not document a queue producer API or a queue capability for sandboxed plugins.
- Because queue access is not documented in the plugin capability model, I plan to treat Queues as unavailable to sandboxed plugins for v1 unless we verify otherwise before implementation starts.

Planned structure:

- `mailService.enqueue(message)` exists now
- v1 implementation: `enqueue()` immediately calls `deliver()`
- this keeps the transport boundary ready for a future queue-backed implementation

## Test plan

Planned test files:

- `src/mail/providers/__tests__/provider-selection.test.ts`
- `src/security/__tests__/turnstile.test.ts`
- `src/security/__tests__/rate-limit.test.ts`
- `src/security/__tests__/idempotency.test.ts`
- `src/mail/render/__tests__/escape-html.test.ts`
- `src/routes/__tests__/submit-route.test.ts`
- `src/routes/__tests__/admin-route.test.ts`

Coverage targets:

- provider selection
- forbidden client mail-routing fields
- Turnstile success and failure
- honeypot silent rejection
- 11th request in a minute returns `429`
- idempotency cache hit does not resend
- HTML escaping of `<script>` and quotes
- configuration-time Cloudflare error state when email send path is unavailable

Implementation approach:

- stub at the `MailProvider` boundary
- stub Turnstile at the fetch boundary
- use worker-compatible Vitest setup

## Proposed subagent split

Decision: **do not use subagents for implementation unless this plan changes materially.**

Reasoning:

- This repo is greenfield and the highest-risk work is contract design, not bulk coding.
- Provider logic, route validation, settings validation, and admin state are tightly coupled through shared types.
- The shared files the user explicitly called out (`src/index.ts`, `src/sandbox-entry.ts`, `package.json`, `wrangler.jsonc`) sit directly on the critical path.
- Parallelizing too early would create merge overhead with little speed benefit.

If we later decide to parallelize after the contracts are stable, the cleanest split would be:

- Agent A: `src/mail/**`, `src/security/turnstile.ts`, provider tests
- Agent B: `src/admin/**`, `src/settings.ts`, admin tests
- Main agent only: `src/index.ts`, `src/sandbox-entry.ts`, `package.json`, `wrangler.jsonc`, README, examples, cross-cutting integration tests

## Open questions requiring approval before coding

1. **Standard plugin vs embeddable component conflict**
   - The verified EmDash docs say standard sandboxed plugins cannot ship Portable Text block types or site-side Astro components.
   - Your requirements ask for an embeddable form component usable in Astro/Portable Text.
   - Proposed resolution: keep the plugin standard and marketplace-publishable, and ship a documented consumer-side snippet in `examples/contact-form.astro` plus the stable POST API contract in the README, rather than a plugin-mounted site component.
   - Please confirm whether that compromise is acceptable.

2. **Route publishing doc conflict**
   - The main EmDash skill says standard plugin routes work in sandboxed mode.
   - The publishing reference warns that API routes “require trusted mode.”
   - First-party repo inspection did not produce a standard-format plugin with a public route, while the first-party `forms` plugin does use public routes from a non-standard inline/native-style shape.
   - Proposed resolution: treat standard-plugin public routes as **unverified** until you explicitly approve that risk, rather than assuming the skill doc wins.
   - Please confirm how you want to handle that risk.

3. **Allowed origins behavior**
   - Decision received: support configurable allowed origins for headless EmDash deployments.
   - Plan update:
     - persist `settings:allowedOrigins` as an array of origin strings
     - expose it in admin as a textarea with one origin per line
     - if empty, auto-detect the current site's origin on the first submit when possible
     - if still empty, fall back gracefully to same-origin-only behavior until an origin is learned or saved
     - reject requests with missing `Origin`, or with a non-matching origin, using `403` and `status: "origin_not_allowed"`
   - No further decision needed here unless you want different missing-`Origin` behavior.

4. **ZeptoMail secret storage**
   - The requirements explicitly mention secure storage for the Turnstile secret key, but not the ZeptoMail API key.
   - Proposed resolution: store the ZeptoMail API key the same way, as a secret input persisted in plugin-scoped KV and never rendered back.
   - Please confirm.

5. **Public route architecture is now unverified for standard plugins**
   - After inspecting first-party plugins, I do not have a first-party example of a standard-format marketplace-style plugin using a public API route.
   - The only first-party public-route example I found is `forms`, which is using the older/native-style inline plugin shape with `adminEntry` and `componentsEntry`.
   - Proposed resolution: before implementation, we should either:
     - accept a riskier standard-plugin public-route build based on the skill docs, or
     - change architecture toward a trusted/native plugin if marketplace publishability is less important than matching known-working first-party route behavior.
   - I recommend pausing for your decision here rather than pretending the docs are settled.
