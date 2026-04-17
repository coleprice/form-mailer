import { describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "../src/security/turnstile.js";
import { createMockContext } from "./helpers/mock-context.js";

describe("Turnstile verification", () => {
  it("returns true when Cloudflare reports success", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    const { ctx } = createMockContext({
      http: { fetch }
    });

    await expect(
      verifyTurnstile({
        ctx,
        token: "test-token",
        secret: "test-turnstile-secret",
        remoteIp: "203.0.113.5"
      })
    ).resolves.toBe(true);
  });

  it("returns false when Cloudflare reports failure", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ success: false })));
    const { ctx } = createMockContext({
      http: { fetch }
    });

    await expect(
      verifyTurnstile({
        ctx,
        token: "test-token",
        secret: "test-turnstile-secret",
        remoteIp: "203.0.113.5"
      })
    ).resolves.toBe(false);
  });
});

