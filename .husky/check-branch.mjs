import { execSync } from 'node:child_process';

function getCurrentBranchName() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    console.error('Error: Unable to determine the current branch.');
    process.exit(1);
  }
}

const branchName = getCurrentBranchName();

const isValidBranchName =
  branchName === 'master' ||
  branchName === 'main' ||
  branchName === 'design' ||
  branchName === 'develop' ||
  /^release\/v\d+\.\d+\.\d+$/.test(branchName) ||
  /^(feature|hotfix)\/([A-Za-z]{1,5}-\d{1,5})(-[\w.]+)*$/.test(branchName);

if (!isValidBranchName) {
  console.error(
    'Error: Branch name must be one of: main, master, develop, design, ' +
      'feature/{TICKET}-slug, hotfix/{TICKET}-slug, or release/vX.Y.Z',
  );
  process.exit(1);
}

console.log(`OK branch: ${branchName}`);
