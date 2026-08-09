import { writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const commitMessageFilePath = process.argv[2];

const getGitBranch = () => {
  try {
    return execSync('git symbolic-ref --short HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const getTicketNumberFromCommit = (commitMessage) => {
  const match = commitMessage.match(/:\s*([A-Z]{1,5}-\d{1,5})\b/);
  return match ? match[1] : null;
};

const extractTicketNumberFromBranch = (branchName) => {
  const match = branchName.match(/(?:feature|hotfix)\/([A-Z]{1,5}-\d{1,5})/i);
  return match ? match[1].toUpperCase() : null;
};

const addTicketNumberToCommitMessage = (commitMessage) => {
  const branchName = getGitBranch();
  const ticketNumber = extractTicketNumberFromBranch(branchName);

  if (ticketNumber) {
    const modified = commitMessage.replace(/^(.*):\s*/, `$1: ${ticketNumber} `);
    writeFileSync(commitMessageFilePath, modified, 'utf8');
  }
};

console.log('Checking ticket number on commit message');
try {
  const commitMessage = readFileSync(commitMessageFilePath, 'utf8');

  if (commitMessage.includes('Release')) {
    console.info('Skipping ticket number as this is a release commit');
    process.exit(0);
  }

  if (!getTicketNumberFromCommit(commitMessage)) {
    addTicketNumberToCommitMessage(commitMessage);
  }
} catch (error) {
  console.error('An error occurred:', error instanceof Error ? error.message : error);
  process.exit(1);
}
