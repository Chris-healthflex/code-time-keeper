// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// @tanstack/start-server-core calls createCsrfMiddleware() at module level inside
// createStartHandler.js. When the Vercel SSR bundle is evaluated by Node.js ESM,
// the circular dep between the two server chunks means createCsrfMiddleware is still
// undefined at that point. This plugin defers the call to a lazy getter.
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

// The Vercel/Node.js SSR bundle has a circular ESM dependency:
//   ssr.mjs → dynamic import → shim.mjs → static import → large.mjs
//   large.mjs → static import → shim.mjs  (cycle!)
// Node.js evaluates large.mjs first (because shim imports it), so __exportAll and
// createCsrfMiddleware are undefined when large.mjs runs, causing 500 on every request.
//
// Fix: break the cycle by removing shim's static import of server_exports from large,
// and changing ssr.mjs to import server_exports directly from the large chunk.
// Evaluation order after fix: shim (no deps) → large (imports shim) → ssr.mjs .then() runs ✓
function fixSsrCircularDep(): Plugin {
  function patchBundle(
    dir: string,
    getChunkCode: (name: string) => string | undefined,
    setChunkCode: (name: string, code: string) => void,
  ) {
    const ssrName = "_ssr/ssr.mjs";
    const ssrCode = getChunkCode(ssrName);
    if (!ssrCode) return;

    // Find: import("./server-HASH.mjs").then((n) => n.PROP)
    const ssrImportMatch = ssrCode.match(
      /import\("(\.\/server-[^"]+)"\)\.then\(\(n\)\s*=>\s*n\.(\w+)\)/,
    );
    if (!ssrImportMatch) return;
    const [, shimRelPath, shimExportProp] = ssrImportMatch;

    const shimName = `_ssr/${shimRelPath.slice(2)}`;
    const shimCode = getChunkCode(shimName);
    if (!shimCode || !shimCode.includes("createCsrfMiddleware")) return;
    if (!shimCode.includes(`server_exports as ${shimExportProp}`)) return;

    // Find shim's import of server_exports from the large chunk
    const shimImportMatch = shimCode.match(/import \{([^}]+)\} from "(\.\/server-[^"]+)"/);
    if (!shimImportMatch) return;
    const [fullImport, importsList, largeRelPath] = shimImportMatch;
    if (!importsList.includes("server_exports")) return;

    const largeName = `_ssr/${largeRelPath.slice(2)}`;
    const largeCode = getChunkCode(largeName);
    if (!largeCode) return;

    // Find large chunk's export alias for server_exports
    const largeExportMatch = largeCode.match(/\bserver_exports as (\w+)\b/);
    if (!largeExportMatch) return;
    const largeExportProp = largeExportMatch[1];

    // Patch shim: remove server_exports from its import of the large chunk
    const remaining = importsList
      .split(",")
      .map((s) => s.trim())
      .filter((s) => !s.endsWith("as server_exports"));
    let newShimCode = shimCode;
    if (remaining.length === 0) {
      newShimCode = newShimCode.replace(fullImport + ";\n", "").replace(fullImport + ";", "").replace(fullImport, "");
    } else {
      newShimCode = newShimCode.replace(fullImport, `import { ${remaining.join(", ")} } from "${largeRelPath}"`);
    }
    newShimCode = newShimCode
      .replace(`, server_exports as ${shimExportProp}`, "")
      .replace(`server_exports as ${shimExportProp}, `, "");

    // Patch ssr.mjs: import server_exports from large chunk directly
    const newSsrCode = ssrCode.replace(
      `import("${shimRelPath}").then((n) => n.${shimExportProp})`,
      `import("${largeRelPath}").then((n) => n.${largeExportProp})`,
    );

    setChunkCode(shimName, newShimCode);
    setChunkCode(ssrName, newSsrCode);
    console.log(
      `[fix-ssr-circular-dep] broke cycle: ${shimName} no longer imports from ${largeName}; ssr.mjs now imports ${largeName} directly`,
    );

    // Also patch written files on disk (in case generateBundle mutation isn't flushed)
    if (dir) {
      try {
        writeFileSync(join(dir, shimName), newShimCode, "utf8");
        writeFileSync(join(dir, ssrName), newSsrCode, "utf8");
      } catch {
        // output dir not yet written (generateBundle path) — that's fine
      }
    }
  }

  return {
    name: "fix-ssr-circular-dep",
    apply: "build",
    enforce: "post",

    generateBundle(opts, bundle) {
      const chunks = bundle as Record<string, { type: string; code: string }>;
      patchBundle(
        opts.dir ?? "",
        (name) => chunks[name]?.type === "chunk" ? chunks[name].code : undefined,
        (name, code) => { if (chunks[name]) chunks[name].code = code; },
      );
    },

    // Fallback: patch files on disk after they're written
    closeBundle() {
      const candidates = [
        ".output/server",
        ".vercel/output/functions/__server.func",
      ];
      for (const dir of candidates) {
        try {
          const ssrCode = readFileSync(join(dir, "_ssr/ssr.mjs"), "utf8");
          patchBundle(
            dir,
            (name) => { try { return readFileSync(join(dir, name), "utf8"); } catch { return undefined; } },
            (name, code) => writeFileSync(join(dir, name), code, "utf8"),
          );
          void ssrCode; // consumed by patchBundle above
          break;
        } catch {
          // try next candidate
        }
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [fixCsrfInitOrder(), fixSsrCircularDep()],
  },
});
