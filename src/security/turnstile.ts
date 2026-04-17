import { TURNSTILE_VERIFY_URL } from "../constants.js";
import type { PluginContextLike } from "../types.js";

export async function verifyTurnstile(input: {
  ctx: PluginContextLike;
  token: string | undefined;
  secret: string | undefined;
  remoteIp: string;
}): Promise<boolean> {
  const { ctx, token, secret, remoteIp } = input;
  if (!token || !secret || !ctx.http) {
    return false;
  }

  const response = await ctx.http.fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      secret,
      response: token,
      remoteip: remoteIp
    })
  });

  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}
