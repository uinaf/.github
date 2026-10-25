import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { resolveConfigPresets } from "renovate/dist/config/presets/index.js";
import { GlobalConfig } from "renovate/dist/config/global.js";
import { getConfig } from "renovate/dist/config/defaults.js";
import { mergeChildConfig } from "renovate/dist/config/utils.js";
import { CustomDatasource } from "renovate/dist/modules/datasource/custom/index.js";
import { applyPackageRules } from "renovate/dist/util/package-rules/index.js";
import { init, set } from "renovate/dist/util/cache/memory/index.js";
import { buildCacheKey } from "renovate/dist/util/cache/package/key.js";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: resolve-presets.mjs <config.json...>");
  process.exit(2);
}

// Resolve our presets from this checkout so CI tests the proposed revision.
init();
GlobalConfig.set({ localDir: process.cwd() });
const configs = new Map();
for (const file of files) {
  const config = JSON.parse(await readFile(file, "utf8"));
  configs.set(file, config);
  set(buildCacheKey("preset", `github>uinaf/.github:${basename(file, ".json")}`), config);
}

let failed = false;
for (const [file, input] of configs) {
  try {
    const { config } = await resolveConfigPresets(input);
    if (file === "renovate-vite-plus.json") await checkVitePlus(config);
    console.log(`ok   ${file}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${file}: ${error.validationError ?? error.message}`);
  }
}
process.exit(failed ? 1 : 0);

async function checkVitePlus(preset) {
  const config = mergeChildConfig(getConfig(), preset);
  const rule = (packageName) =>
    applyPackageRules({
      ...config,
      manager: "npm",
      datasource: "npm",
      packageName,
      depName: packageName,
    });
  for (const name of [
    "@vitest/eslint-plugin",
    "@vitest/coverage-c8",
    "@vitest/browser-webdriverio",
  ]) {
    assert.equal((await rule(name)).datasource, "npm", `${name} must remain independent`);
  }
  const directory = await mkdtemp(join(tmpdir(), "vite-plus-mapping-"));
  const previousLocalDir = GlobalConfig.get("localDir");
  GlobalConfig.set({ localDir: directory });
  try {
    const manifest = {
      "dist-tags": { latest: "2.0.0" },
      versions: {
        "2.0.0": {
          dependencies: { vite: "npm:@voidzero-dev/vite-plus-core@2.0.0", vitest: "6.0.0" },
        },
      },
      time: { "2.0.0": "2026-01-01T00:00:00.000Z" },
    };
    const path = join(directory, "manifest.json");
    await writeFile(path, JSON.stringify(manifest));
    const source = new CustomDatasource();
    for (const [name, expected] of [
      ["vite-plus", "2.0.0"],
      ["@voidzero-dev/vite-plus-core", "2.0.0"],
      ["vitest", "6.0.0"],
      ["@vitest/coverage-v8", "6.0.0"],
      ["@vitest/coverage-istanbul", "6.0.0"],
      ["@vitest/browser-playwright", "6.0.0"],
    ]) {
      const mapped = await rule(name);
      assert.equal(mapped.datasource, "custom.vite-plus-component");
      const updated = await applyPackageRules({
        ...mapped,
        updateType: "patch",
        sourceUrl: "https://github.com/vitest-dev/vitest",
      });
      assert.equal(updated.groupName, "vite-plus toolchain");
      assert.equal(updated.groupSlug, "vite-plus-toolchain");
      assert.deepEqual(mapped.registryUrls, ["https://registry.npmjs.org/vite-plus"]);
      const lookup = { ...mapped, registryUrl: `file://${path}` };
      const releases = await source.getReleases(lookup);
      assert.equal(releases?.tags?.latest, expected, name);
      assert.deepEqual(
        releases.releases.map(({ version, releaseTimestamp }) => ({ version, releaseTimestamp })),
        [{ version: expected, releaseTimestamp: manifest.time["2.0.0"] }],
      );
      const invalid = structuredClone(manifest);
      invalid.versions["2.0.0"].dependencies.vitest = "^6.0.0";
      const badPath = join(directory, "invalid.json");
      await writeFile(badPath, JSON.stringify(invalid));
      assert.equal(
        await source.getReleases({ ...lookup, registryUrl: `file://${badPath}` }),
        null,
        `${name} must reject an invalid bundle`,
      );
    }
  } finally {
    GlobalConfig.set({ localDir: previousLocalDir });
    await rm(directory, { recursive: true, force: true });
  }
}
