// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// @tanstack/start-server-core calls createCsrfMiddleware() at module level inside
// createStartHandler.js. When the Vercel SSR bundle is evaluated by Node.js 24 ESM,
// the circular dep between the two server chunks means createCsrfMiddleware is still
// undefined at that point, crashing every request with "not a function". This plugin
// defers the call to a lazy getter so it only runs after all modules are initialised.
function fixCsrfInitOrder(): Plugin {
  const NEEDLE =
    `var defaultCsrfMiddleware = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" });`;
  const REPLACEMENT =
    `var _defaultCsrfMiddlewareCache; ` +
    `function _getDefaultCsrfMiddleware(){` +
    `return _defaultCsrfMiddlewareCache??` +
    `(_defaultCsrfMiddlewareCache=createCsrfMiddleware({filter:(ctx)=>ctx.handlerType==="serverFn"}));` +
    `}`;

  return {
    name: "fix-csrf-init-order",
    transform(code, id) {
      if (!id.includes("start-server-core") || !id.includes("createStartHandler")) return;
      if (!code.includes(NEEDLE)) return;
      return code
        .replace(NEEDLE, REPLACEMENT)
        .replace(/\bdefaultCsrfMiddleware\b/g, "_getDefaultCsrfMiddleware()");
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [fixCsrfInitOrder()],
  },
});
