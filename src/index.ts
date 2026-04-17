import type { PluginDescriptor } from "emdash";
import {
  PLUGIN_ID,
  PLUGIN_VERSION,
  SANDBOX_ENTRYPOINT
} from "./constants.js";

export function formMailerPlugin(): PluginDescriptor {
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    format: "standard",
    entrypoint: SANDBOX_ENTRYPOINT,
    capabilities: ["email:send", "network:fetch"],
    allowedHosts: ["challenges.cloudflare.com", "api.zeptomail.com"],
    adminPages: [
      {
        path: "/settings",
        label: "Form Mailer",
        icon: "mail"
      }
    ]
  };
}

export default formMailerPlugin;

