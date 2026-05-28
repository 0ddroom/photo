import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const requested = process.argv.slice(2);
const testFiles = requested.length > 0
  ? requested
  : (await readdir('tests'))
    .filter((file) => file.endsWith('.test.js'))
    .map((file) => path.join('tests', file));

let failures = 0;

for (const file of testFiles) {
  try {
    const module = await import(pathToFileURL(path.resolve(file)));
    const cases = module.default ?? [];

    for (const [name, run] of cases) {
      try {
        await run();
        console.log(`ok - ${name}`);
      } catch (error) {
        failures += 1;
        console.error(`not ok - ${name}`);
        console.error(error);
      }
    }
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${file}`);
    console.error(error);
  }
}

if (failures > 0) {
  console.error(`${failures} test file or case failed.`);
  process.exit(1);
}

console.log(`${testFiles.length} test file(s) passed.`);
