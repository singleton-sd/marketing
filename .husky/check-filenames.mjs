import { execSync } from 'node:child_process';

// Allows: kebab-case.ts, kebab-case.spec.ts, PascalCase.ts, PascalCase.d.ts, etc.
const allowedPattern =
  /^([a-z0-9-]+|[A-Z][a-zA-Z0-9]+)(\.spec|\.test)?(\.d)?(\.defs)?\.tsx?$/;

const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', {
  encoding: 'utf8',
})
  .split('\n')
  .map((file) => file.trim())
  .filter((file) => file !== '')
  .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'));

const invalidFiles = stagedFiles.filter((file) => {
  const fileName = file.split(/[/\\]/).pop();
  return fileName && !allowedPattern.test(fileName);
});

if (invalidFiles.length > 0) {
  console.error(
    `The following files do not match naming (kebab-case.ts or PascalCase.ts):\n${invalidFiles.join('\n')}`,
  );
  process.exit(1);
}

console.log('All staged TypeScript files follow the naming convention.');
