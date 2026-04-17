import type { MailProvider, PluginContextLike, PluginSettings } from "../types.js";
import { CloudflareEmailProvider } from "./providers/cloudflare-email-provider.js";
import { ZeptomailProvider } from "./providers/zeptomail-provider.js";

export function createProvider(
  ctx: PluginContextLike,
  settings: PluginSettings
): MailProvider {
  if (settings.provider === "cloudflare") {
    return new CloudflareEmailProvider(ctx);
  }

  return new ZeptomailProvider(ctx, settings.zeptoMailApiKey ?? "");
}

