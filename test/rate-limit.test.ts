import { describe, expect, it, vi } from "vitest";
import { handleSubmitRoute } from "../src/routes/submit.js";
import {
  buildSubmitRequest,
  captureThrownJson,
  createMockContext,
  seedConfiguredSettings
} from "./helpers/mock-context.js";

describe("rate limiting", () => {
  it("returns 429 on the 11th submission within a minute", async () => {
    const deliver = vi.fn(async () => ({
      ok: true as const,
      provider: "cloudflare" as const
    }));
    const { ctx } = createMockContext();
    await seedConfiguredSettings(ctx, {
      rateLimitPerMinute: 10
    });

    for (let index = 0; index < 10; index += 1) {
      await handleSubmitRoute(
        {
          request: buildSubmitRequest({
            formName: "Contact",
            fields: {
              name: `Ada ${index}`
            }
          })
        },
        ctx,
        {
          deliver,
          now: () => new Date("2026-04-17T12:00:00.000Z")
        }
      );
    }

    const result = await captureThrownJson(() =>
      handleSubmitRoute(
        {
          request: buildSubmitRequest({
            formName: "Contact",
            fields: {
              name: "Ada 11"
            }
          })
        },
        ctx,
        {
          deliver,
          now: () => new Date("2026-04-17T12:00:00.000Z")
        }
      )
    );

    expect(result.status).toBe(429);
    expect(result.body).toEqual(
      expect.objectContaining({
        status: "rate_limited"
      })
    );
  });
});
