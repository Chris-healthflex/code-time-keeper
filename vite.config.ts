// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// @tanstack/start-server-core calls createCsrfMiddleware() at module level inside
// createStartHandler.js. When the Vercel SSR bundle is evaluated by Node.js ESM,
// the circular dep between the two server chunks means createCsrfMiddleware is still
// undefined at that point. This plugin defers the call to a lazy getter.
//
// The other half of the circular dep fix (patching ssr.mjs + the shim chunk) runs
// as a postbuild script: scripts/fix-ssr-circular-dep.mjs
// That script must run AFTER the full Nitro build completes, which is why it can't
// live in a Vite plugin hook (the Nitro Vite sub-build runs in an isolated process).
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
    server: { entry: "server" },
  },
  vite: {
    plugins: [fixCsrfInitOrder()],
  },
});
