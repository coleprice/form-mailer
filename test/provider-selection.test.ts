import { describe, expect, it } from "vitest";
import { createProvider } from "../src/mail/provider-factory.js";
import { CloudflareEmailProvider } from "../src/mail/providers/cloudflare-email-provider.js";
import { ZeptomailProvider } from "../src/mail/providers/zeptomail-provider.js";
import { createMockContext } from "./helpers/mock-context.js";

describe("provider selection", () => {
  it("selects Cloudflare provider when configured", () => {
    const { ctx } = createMockContext();
    const provider = createProvider(ctx, {
      provider: "cloudflare",
      senderAddress: "sender@example.com",
      recipientAddresses: ["dest@example.com"],
      subjectTemplate: "[{site}] {formName}",
      successMessage: "ok",
      allowedOrigins: ["https://site.example"],
      turnstileSiteKey: "",
      honeypotFieldName: "website",
      rateLimitPerMinute: 10,
      turnstileEnabled: false,
      honeypotEnabled: true,
      strictMode: true
    });

    expect(provider).toBeInstanceOf(CloudflareEmailProvider);
  });

  it("selects ZeptoMail provider when configured", () => {
    const { ctx } = createMockContext();
    const provider = createProvider(ctx, {
      provider: "zeptomail",
      senderAddress: "sender@example.com",
      recipientAddresses: ["dest@example.com"],
      subjectTemplate: "[{site}] {formName}",
      successMessage: "ok",
      allowedOrigins: ["https://site.example"],
      turnstileSiteKey: "",
      honeypotFieldName: "website",
      rateLimitPerMinute: 10,
      turnstileEnabled: false,
      honeypotEnabled: true,
      strictMode: true,
      zeptoMailApiKey: "zepto-test-key-REPLACE-ME"
    });

    expect(provider).toBeInstanceOf(ZeptomailProvider);
  });
});

