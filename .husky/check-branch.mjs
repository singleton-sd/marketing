import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function getCurrentBranchName() {
  const headPath = resolve('.git', 'HEAD');
  const headContent = readFileSync(headPath, 'utf8').trim();
  const branchMatch = headContent.match(/^ref: refs\/heads\/(.+)$/);

  if (branchMatch && branchMatch[1]) {
    return branchMatch[1];
  }

  console.error('Error: Unable to determine the current branch.');
  process.exit(1);
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
