import { ZEPTOMAIL_API_URL } from "../../constants.js";
import type {
  MailProvider,
  NormalizedMessage,
  PluginContextLike,
  SendResult
} from "../../types.js";

export class ZeptomailProvider implements MailProvider {
  constructor(
    private readonly ctx: PluginContextLike,
    private readonly apiKey: string
  ) {}

  async send(message: NormalizedMessage): Promise<SendResult> {
    if (!this.ctx.http) {
      return {
        ok: false,
        provider: "zeptomail",
        errorType: "fetch_unavailable",
        errorMessage: "HTTP fetch is unavailable."
      };
    }

    try {
      const response = await this.ctx.http.fetch(ZEPTOMAIL_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Zoho-enczapikey ${this.apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: { address: message.from.email },
          to: message.to.map((address) => ({
            email_address: { address }
          })),
          subject: message.subject,
          textbody: message.text,
          htmlbody: message.html
        })
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          ok: false,
          provider: "zeptomail",
          errorType: "zeptomail_rejected",
          errorMessage: `ZeptoMail rejected the send: ${text || response.statusText}`
        };
      }

      let messageId: string | undefined;
      try {
        const data = (await response.json()) as { data?: Array<{ message_id?: string }> };
        messageId = data.data?.[0]?.message_id;
      } catch {
        messageId = undefined;
      }

      return {
        ok: true,
        provider: "zeptomail",
        ...(messageId ? { messageId } : {})
      };
    } catch (error) {
      return {
        ok: false,
        provider: "zeptomail",
        errorType: "zeptomail_send_failed",
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
