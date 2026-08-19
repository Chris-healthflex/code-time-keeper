/**
 * Post-build patch: breaks the circular ESM dependency in the Nitro SSR bundle.
 *
 * The Rolldown SSR bundle has a cycle:
 *   ssr.mjs → (dynamic import) → shim.mjs → (static import) → large.mjs
 *   large.mjs → (static import) → shim.mjs   ← cycle!
 *
 * Node.js evaluates large.mjs first (because shim imports it), so __exportAll
 * and createCsrfMiddleware from the shim are undefined → 500 on every request.
 *
 * Fix:
 *   1. Remove shim's circular static import of server_exports from large.mjs
 *   2. Remove server_exports from shim's exports
 *   3. Change ssr.mjs to import server_exports directly from large.mjs
 *
 * After the patch the shim has zero deps and evaluates first, then large.mjs
 * evaluates with all symbols defined.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

const SEARCH_DIRS = [
  ".vercel/output/functions/__server.func",
  ".output/server",
];

function patch(dir) {
  const ssrPath = join(dir, "_ssr/ssr.mjs");
  let ssrCode;
  try {
    ssrCode = readFileSync(ssrPath, "utf8");
  } catch {
    return false; // this dir doesn't have the output
  }

  // Find dynamic import of shim: import("./server-HASH.mjs").then((n) => n.PROP)
  const ssrMatch = ssrCode.match(
    /import\("(\.\/server-[^"]+)"\)\.then\(\(n\)\s*=>\s*n\.(\w+)\)/,
  );
  if (!ssrMatch) {
    console.log(`[fix-ssr] ${ssrPath}: no dynamic server import found — skipping`);
    return true;
  }
  const [, shimRelPath, shimExportProp] = ssrMatch;
  const shimPath = join(dirname(ssrPath), shimRelPath.slice(2));

  let shimCode;
  try {
    shimCode = readFileSync(shimPath, "utf8");
  } catch {
    console.log(`[fix-ssr] shim not found: ${shimPath}`);
    return true;
  }

  // Verify this is the right shim (has createCsrfMiddleware inline + exports shimExportProp as server_exports)
  if (!shimCode.includes("createCsrfMiddleware")) {
    console.log(`[fix-ssr] ${shimPath}: not the CSRF shim — skipping`);
    return true;
  }
  if (!shimCode.includes(`server_exports as ${shimExportProp}`)) {
    console.log(`[fix-ssr] already patched or structure changed — skipping`);
    return true;
  }

  // Find shim's static import of server_exports from the large chunk
  const shimImportMatch = shimCode.match(/import \{([^}]+)\} from "(\.\/server-[^"]+)"/);
  if (!shimImportMatch) {
    console.log(`[fix-ssr] ${shimPath}: no static import found — already clean`);
    return true;
  }
  const [fullImport, importsList, largeRelPath] = shimImportMatch;
  if (!importsList.includes("server_exports")) {
    console.log(`[fix-ssr] ${shimPath}: import doesn't include server_exports — skipping`);
    return true;
  }

  // Read large chunk and find its export alias for server_exports
  const largePath = join(dirname(ssrPath), largeRelPath.slice(2));
  let largeCode;
  try {
    largeCode = readFileSync(largePath, "utf8");
  } catch {
    console.log(`[fix-ssr] large chunk not found: ${largePath}`);
    return true;
  }
  const largeExportMatch = largeCode.match(/\bserver_exports as (\w+)\b/);
  if (!largeExportMatch) {
    console.log(`[fix-ssr] ${largePath}: no server_exports export alias found`);
    return true;
  }
  const largeExportProp = largeExportMatch[1];

  // ── Apply patches ──────────────────────────────────────────────────────────

  // 1. Remove server_exports from shim's import of large chunk
  const remaining = importsList
    .split(",")
    .map((s) => s.trim())
    .filter((s) => !s.endsWith("as server_exports"));

  let newShimCode = shimCode;
  if (remaining.length === 0) {
    // Remove entire import line
    newShimCode = newShimCode
      .replace(fullImport + ";\n", "")
      .replace(fullImport + ";", "")
      .replace(fullImport, "");
  } else {
    newShimCode = newShimCode.replace(
      fullImport,
      `import { ${remaining.join(", ")} } from "${largeRelPath}"`,
    );
  }
  // Remove server_exports from shim's export list
  newShimCode = newShimCode
    .replace(`, server_exports as ${shimExportProp}`, "")
    .replace(`server_exports as ${shimExportProp}, `, "");

  // 2. Change ssr.mjs to import server_exports directly from large chunk
  const newSsrCode = ssrCode.replace(
    `import("${shimRelPath}").then((n) => n.${shimExportProp})`,
    `import("${largeRelPath}").then((n) => n.${largeExportProp})`,
  );

  writeFileSync(shimPath, newShimCode, "utf8");
  writeFileSync(ssrPath, newSsrCode, "utf8");

  console.log(`[fix-ssr] ✓ patched ${dir}`);
  console.log(`  shim: removed circular import from ${largeRelPath}`);
  console.log(`  ssr.mjs: now imports ${largeRelPath} directly as n.${largeExportProp}`);
  return true;
}

let patched = false;
for (const dir of SEARCH_DIRS) {
  if (patch(dir)) {
    patched = true;
    break;
  }
}
if (!patched) {
  console.log("[fix-ssr] no output dir found — nothing to patch");
}
