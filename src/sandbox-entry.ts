import { definePlugin } from "emdash";
import { handleAdminRoute } from "./routes/admin.js";
import { handleSubmitRoute } from "./routes/submit.js";
import { seedDefaultSettings } from "./settings.js";

export default definePlugin({
  hooks: {
    "plugin:install": {
      handler: async (_event: unknown, ctx: unknown) => {
        await seedDefaultSettings(ctx as never);
      }
    }
  },

  routes: {
    admin: {
      handler: async (routeCtx: unknown, ctx: unknown) => {
        return handleAdminRoute(routeCtx as never, ctx as never);
      }
    },
    submit: {
      public: true,
      handler: async (routeCtx: unknown, ctx: unknown) => {
        return handleSubmitRoute(routeCtx as never, ctx as never);
      }
    }
  }
});
