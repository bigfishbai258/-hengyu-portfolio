import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const root = resolve("dist");
const all = await readdir(root, { recursive: true });
const allAssetFiles = all
  .map((path) => path.replaceAll("\\", "/"))
  .filter(
    (path) =>
      path === "portfolio.pdf" ||
      /^works\/.*\.(webp|png)$/.test(path) ||
      path === "index.html" ||
      path === "manifest.webmanifest" ||
      path === "favicon.svg" ||
      /^(assets|icons|archives|licenses)\/[^/]+\.[^/]+$/.test(path) ||
      /^fonts\/.*\.(woff2|pdf|txt|json|md)$/.test(path) ||
      /^audio\/(atmosphere|motif|pulse)\.(ogg|m4a)$/.test(path),
  )
  .filter((path) => !/^assets\/archive-(cassette|cassette-mobile|assembly)\.glb$/.test(path))
  .sort();

if (!allAssetFiles.some((path) => /^assets\/index-.*\.js$/.test(path))) {
  throw Error("Build the application before generating the offline cache.");
}

// Only precache the lightweight core app shell on install; heavy 3D models,
// cover galleries, font shards, audio, and the PDF are cached on demand as visited.
const precacheFiles = allAssetFiles.filter(
  (path) =>
    path === "index.html" ||
    path === "manifest.webmanifest" ||
    path === "favicon.svg" ||
    /^assets\/index-.*\.(js|css)$/.test(path) ||
    /^icons\/[^/]+\.[^/]+$/.test(path),
);

const worker = await readFile("scripts/pwa-worker.js", "utf8");
const hash = createHash("sha256").update(worker);
let totalBytes = 0;
let precacheBytes = 0;
const precacheSet = new Set(precacheFiles);
for (const file of allAssetFiles) {
  const content = await readFile(resolve(root, file));
  hash.update(file).update(content);
  totalBytes += content.length;
  if (precacheSet.has(file)) precacheBytes += content.length;
}
const version = hash.digest("hex").slice(0, 16);

await writeFile(
  resolve(root, "sw.js"),
  worker
    .replace("__CACHE_VERSION__", JSON.stringify(version))
    .replace("__PRECACHE_FILES__", JSON.stringify(precacheFiles)),
);
await writeFile(
  resolve(root, "pwa-build.json"),
  JSON.stringify(
    {
      version,
      bytes: precacheBytes,
      totalBytes,
      files: precacheFiles,
      totalFiles: allAssetFiles.length,
    },
    null,
    2,
  ),
);
console.log(
  `Offline release ${version}: precache ${precacheFiles.length} core files (${(precacheBytes / 1024 / 1024).toFixed(2)} MiB), on-demand ${allAssetFiles.length - precacheFiles.length} assets (${(totalBytes / 1024 / 1024).toFixed(1)} MiB total).`,
);
