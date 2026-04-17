import type {
  MailProvider,
  NormalizedMessage,
  PluginContextLike,
  SendResult
} from "../../types.js";

export class CloudflareEmailProvider implements MailProvider {
  constructor(private readonly ctx: PluginContextLike) {}

  async send(message: NormalizedMessage): Promise<SendResult> {
    if (!this.ctx.email) {
      return {
        ok: false,
        provider: "cloudflare",
        errorType: "binding_missing",
        errorMessage: "Cloudflare email binding is unavailable."
      };
    }

    try {
      const result = await this.ctx.email.send({
        to: message.to,
        from: message.from.email,
        subject: message.subject,
        text: message.text,
        html: message.html
      });

      return {
        ok: true,
        provider: "cloudflare",
        ...(result.messageId ? { messageId: result.messageId } : {})
      };
    } catch (error) {
      return {
        ok: false,
        provider: "cloudflare",
        errorType: "cloudflare_send_failed",
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
