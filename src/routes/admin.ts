import { buildSettingsBlocks } from "../admin/blocks.js";
import { getConfigHealthIssues } from "../admin/config-health.js";
import { parseSettingsForm } from "../admin/validation.js";
import {
  getRuntimeError,
  getStoredSettings,
  getSuggestedOrigin,
  saveSettings
} from "../settings.js";
import type { PluginContextLike, RouteContextLike, SettingsFormValues } from "../types.js";

interface AdminInteraction {
  type?: string;
  page?: string;
  action_id?: string;
  values?: SettingsFormValues;
}

function readInteraction(input: unknown): AdminInteraction {
  if (typeof input === "object" && input !== null) {
    return input as AdminInteraction;
  }
  return {};
}

export async function handleAdminRoute(
  routeCtx: RouteContextLike,
  ctx: PluginContextLike,
  now = new Date()
): Promise<Record<string, unknown>> {
  const interaction = readInteraction(routeCtx.input);
  const storedSettings = await getStoredSettings(ctx);
  const suggestedOrigins = getSuggestedOrigin(routeCtx.request, storedSettings.allowedOrigins);
  const runtimeError = await getRuntimeError(ctx, now);
  const configIssues = getConfigHealthIssues(ctx, storedSettings, runtimeError);

  if (interaction.type === "form_submit" && interaction.action_id === "save_settings") {
    const parsed = parseSettingsForm(
      interaction.values ?? {},
      storedSettings,
      suggestedOrigins
    );

    if (parsed.errors.length > 0 || !parsed.value) {
      const issues = [
        {
          variant: "error" as const,
          title: "Validation error",
          description: parsed.errors.join(" ")
        },
        ...configIssues
      ];

      return {
        blocks: buildSettingsBlocks({
          settings: storedSettings,
          issues,
          suggestedOrigins
        }),
        toast: {
          type: "error",
          message: "Settings could not be saved."
        }
      };
    }

    await saveSettings(ctx, parsed.value);
    const nextSettings = await getStoredSettings(ctx);
    const nextIssues = getConfigHealthIssues(ctx, nextSettings, runtimeError);

    return {
      blocks: buildSettingsBlocks({
        settings: nextSettings,
        issues: nextIssues,
        suggestedOrigins
      }),
      toast: {
        type: "success",
        message: "Settings saved."
      }
    };
  }

  return {
    blocks: buildSettingsBlocks({
      settings: storedSettings,
      issues: configIssues,
      suggestedOrigins
    })
  };
}

