import { describe, expect, it } from "vitest";
import { renderNotificationEmail } from "../src/mail/render/render-notification-email.js";

describe("HTML escaping", () => {
  it("escapes injected script tags and quotes in the HTML body", () => {
    const rendered = renderNotificationEmail({
      formName: "Contact",
      siteName: "site.example",
      origin: "https://site.example",
      fields: [
        {
          key: "message",
          label: "Message",
          value: '<script>alert("xss")</script>'
        }
      ]
    });

    expect(rendered.html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
    expect(rendered.html).not.toContain("<script>");
  });
});

