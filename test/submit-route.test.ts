import { describe, expect, it, vi } from "vitest";
import { SETTINGS_KEYS, SUBMISSION_ID_HEADER } from "../src/constants.js";
import { handleSubmitRoute } from "../src/routes/submit.js";
import {
  buildSubmitRequest,
  captureThrownJson,
  createMockContext,
  seedConfiguredSettings
} from "./helpers/mock-context.js";

describe("submit route", () => {
  it("rejects forbidden client-supplied routing fields", async () => {
    const { ctx } = createMockContext();
    await seedConfiguredSettings(ctx);

    const result = await captureThrownJson(() =>
      handleSubmitRoute(
        {
          request: buildSubmitRequest({
            formName: "Contact",
            fields: {
              to: "attacker@example.com",
              name: "Ada"
            }
          })
        },
        ctx
      )
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual(
      expect.objectContaining({
        status: "validation_error"
      })
    );
  });

  it("silently accepts honeypot submissions without sending", async () => {
    const deliver = vi.fn();
    const { ctx } = createMockContext();
    await seedConfiguredSettings(ctx);

    const result = await handleSubmitRoute(
      {
        request: buildSubmitRequest({
          formName: "Contact",
          honeypot: "bot-filled",
          fields: {
            name: "Ada"
          }
        })
      },
      ctx,
      { deliver }
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: "success"
      })
    );
    expect(deliver).not.toHaveBeenCalled();
  });

  it("rejects failed Turnstile verification", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ success: false })));
    const { ctx } = createMockContext({
      http: { fetch }
    });
    await seedConfiguredSettings(ctx, {
      turnstileEnabled: true,
      turnstileSiteKey: "test-site-key",
      turnstileSecretKey: "test-turnstile-secret"
    });

    const result = await captureThrownJson(() =>
      handleSubmitRoute(
        {
          request: buildSubmitRequest({
            formName: "Contact",
            turnstileToken: "bad-token",
            fields: {
              name: "Ada"
            }
          })
        },
        ctx
      )
    );

    expect(result.status).toBe(403);
    expect(result.body).toEqual(
      expect.objectContaining({
        status: "spam_rejected"
      })
    );
  });

  it("accepts a valid submission and caches the replay-safe response", async () => {
    const deliver = vi.fn(async () => ({
      ok: true as const,
      provider: "cloudflare" as const
    }));
    const { ctx } = createMockContext();
    await seedConfiguredSettings(ctx);

    const request = buildSubmitRequest(
      {
        formName: "Contact",
        fields: {
          name: "Ada",
          email: "ada@example.com"
        }
      },
      {
        headers: {
          [SUBMISSION_ID_HEADER]: "submission-123"
        }
      }
    );

    const result = await handleSubmitRoute({ request }, ctx, { deliver });
    const cached = await ctx.kv.get<{ response: unknown }>("idem:submission-123");

    expect(result).toEqual(
      expect.objectContaining({
        status: "success"
      })
    );
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(cached).toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          status: "success"
        })
      })
    );
    expect(JSON.stringify(cached)).not.toContain("ada@example.com");
    expect(JSON.stringify(cached)).not.toContain("name");
  });

  it("reuses the cached idempotent response without re-sending", async () => {
    const deliver = vi.fn(async () => ({
      ok: true as const,
      provider: "cloudflare" as const
    }));
    const { ctx } = createMockContext();
    await seedConfiguredSettings(ctx);

    const request = buildSubmitRequest(
      {
        formName: "Contact",
        fields: {
          name: "Ada"
        }
      },
      {
        headers: {
          [SUBMISSION_ID_HEADER]: "submission-456"
        }
      }
    );

    await handleSubmitRoute({ request }, ctx, { deliver });
    const secondResult = await handleSubmitRoute(
      {
        request: buildSubmitRequest(
          {
            formName: "Contact",
            fields: {
              name: "Changed"
            }
          },
          {
            headers: {
              [SUBMISSION_ID_HEADER]: "submission-456"
            }
          }
        )
      },
      ctx,
      { deliver }
    );

    expect(deliver).toHaveBeenCalledTimes(1);
    expect(secondResult).toEqual(
      expect.objectContaining({
        status: "success"
      })
    );
  });

  it("returns origin_not_allowed for a non-matching origin", async () => {
    const { ctx } = createMockContext();
    await seedConfiguredSettings(ctx, {
      allowedOrigins: ["https://site.example"]
    });

    const result = await captureThrownJson(() =>
      handleSubmitRoute(
        {
          request: buildSubmitRequest(
            {
              formName: "Contact",
              fields: {
                name: "Ada"
              }
            },
            {
              origin: "https://evil.example"
            }
          )
        },
        ctx
      )
    );

    expect(result.status).toBe(403);
    expect(result.body).toEqual(
      expect.objectContaining({
        status: "origin_not_allowed"
      })
    );
  });

  it("returns configuration_error when Cloudflare provider is selected without a binding", async () => {
    const { ctx } = createMockContext();
    await seedConfiguredSettings(ctx, {
      provider: "cloudflare"
    });
    await ctx.kv.delete(SETTINGS_KEYS.senderAddress);
    await ctx.kv.set(SETTINGS_KEYS.senderAddress, "sender@example.com");

    const result = await captureThrownJson(() =>
      handleSubmitRoute(
        {
          request: buildSubmitRequest({
            formName: "Contact",
            fields: {
              name: "Ada"
            }
          })
        },
        ctx
      )
    );

    expect(result.status).toBe(500);
    expect(result.body).toEqual(
      expect.objectContaining({
        status: "send_failed"
      })
    );
  });
});

