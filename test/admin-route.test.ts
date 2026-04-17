import { describe, expect, it } from "vitest";
import { handleAdminRoute } from "../src/routes/admin.js";
import { createMockContext, seedConfiguredSettings } from "./helpers/mock-context.js";

describe("admin route", () => {
  it("surfaces the Cloudflare binding missing config-health issue", async () => {
    const { ctx } = createMockContext();
    await seedConfiguredSettings(ctx, {
      provider: "cloudflare"
    });

    const result = (await handleAdminRoute(
      {
        request: new Request("https://admin.example/_emdash/plugins/settings"),
        input: {
          type: "page_load",
          page: "/settings"
        }
      },
      ctx
    )) as { blocks: Array<Record<string, unknown>> };

    expect(result.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "banner",
          title: "Cloudflare binding missing"
        })
      ])
    );
  });
});

