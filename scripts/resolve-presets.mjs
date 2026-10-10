import { readFile } from 'node:fs/promises';
import { resolveConfigPresets } from 'renovate/dist/config/presets/index.js';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: resolve-presets.mjs <config.json...>');
  process.exit(2);
}

let failed = false;
for (const file of files) {
  try {
    const config = JSON.parse(await readFile(file, 'utf8'));
    await resolveConfigPresets(config);
    console.log(`ok   ${file}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${file}: ${error.validationError ?? error.message}`);
  }
}
process.exit(failed ? 1 : 0);
