#!/usr/bin/env node
/**
 * Build the shadcn registry JSON outputs.
 *
 * Workflow:
 *   1. Run `shadcn build` — it reads `registry.json`, embeds each file's content,
 *      and writes outputs to `public/r/`.
 *   2. Post-process each emitted registry-item JSON: rewrite the
 *      `@filter-tokens/ui/*` alias (used only inside our repo) to `@/*`
 *      (what shadcn consumers expect).
 *
 * The consumer's `shadcn add` CLI then rewrites `@/*` to their own configured
 * aliases on install, via its `transform-import.ts` ts-morph transform.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REGISTRY_DIR = "public/r";
// Match `filter-tokens/components/...` and `filter-tokens/lib/...` (our internal
// package-scoped paths) and rewrite to shadcn's consumer-side `@/` alias.
// Does NOT match bare `filter-tokens` (the npm package entry, kept as-is so
// the copied source can `import { useFilterTokens } from "filter-tokens"`).
const ALIAS_PATTERN = /\bfilter-tokens\/(components|lib)\//g;
const ALIAS_REPLACEMENT = "@/$1/";

function rewriteAliases(content) {
  return content.replace(ALIAS_PATTERN, ALIAS_REPLACEMENT);
}

function postProcessRegistryFile(path) {
  const json = JSON.parse(readFileSync(path, "utf-8"));

  // A registry-item JSON has `files: [{ path, content, target }]`
  if (Array.isArray(json.files)) {
    for (const file of json.files) {
      if (typeof file.content === "string") {
        file.content = rewriteAliases(file.content);
      }
      if (typeof file.path === "string") {
        // Strip the src/components/ prefix from the emitted path so consumers
        // see a clean `filter-tokens.tsx` path, not `src/components/filter-tokens.tsx`.
        file.path = file.path.replace(/^src\/components\//, "");
      }
    }
  }

  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
}

console.log("Running shadcn build...");
execSync("pnpm exec shadcn build", { stdio: "inherit" });

console.log("\nPost-processing registry outputs...");
const files = readdirSync(REGISTRY_DIR).filter((f) => f.endsWith(".json"));
for (const file of files) {
  if (file === "registry.json") continue; // index file, no `files` array to rewrite
  const fullPath = join(REGISTRY_DIR, file);
  postProcessRegistryFile(fullPath);
  console.log(`  rewrote: ${fullPath}`);
}

console.log("\nDone.");
