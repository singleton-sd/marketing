import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dest = join(dirname(fileURLToPath(import.meta.url)), '../public/admin/vendor');
mkdirSync(dest, { recursive: true });

const files = [
  ['@singleton-sd/tokens/css/dark', 'tokens-dark.css'],
  ['@singleton-sd/tokens/css/root/dark', 'tokens-root-dark.css'],
];

for (const [specifier, name] of files) {
  copyFileSync(fileURLToPath(import.meta.resolve(specifier)), join(dest, name));
}
