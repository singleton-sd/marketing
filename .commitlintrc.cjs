const { execSync } = require('child_process');

const getGitBranch = () => {
  try {
    return execSync('git symbolic-ref --short HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(error);
    return '';
  }
};

const getTicketNumberFromBranch = (branchName) => {
  const match = branchName.match(/(?:feature|hotfix)\/([A-Z]{1,5}-\d{1,5})/i);
  return match ? match[1].toUpperCase() : null;
};

const getTicketNumberFromCommit = (commitMessage) => {
  const match = commitMessage.match(/:\s*([A-Z]{1,5}-\d{1,5})\b/);
  return match ? match[1].toUpperCase() : null;
};

module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'ticket-number': ({ header }) => {
          if (header.includes('Release')) {
            console.info('Skipping ticket number as this is a release commit');
            return [true];
          }
          const branchName = getGitBranch() || '';
          const ticketNumberFromBranch = getTicketNumberFromBranch(branchName);
          const ticketNumberFromCommit = getTicketNumberFromCommit(header);

          if (ticketNumberFromCommit) {
            if (
              ticketNumberFromBranch &&
              ticketNumberFromCommit !== ticketNumberFromBranch
            ) {
              return [
                false,
                `Ticket in commit (${ticketNumberFromCommit}) does not match branch (${ticketNumberFromBranch}).`,
              ];
            }
            return [true];
          }

          if (ticketNumberFromBranch) {
            return [true];
          }

          return [
            false,
            'Commit must include MKT-<n> (or branch feature/MKT-<n>-...).',
          ];
        },
      },
    },
  ],
  rules: {
    'ticket-number': [2, 'always'],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 72],
    'subject-max-length': [2, 'always', 50],
    // Disabled: ticket IDs (MKT-1) make sentence-case fail on the full subject.
    'subject-case': [0],
    'subject-full-stop': [2, 'never'],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'chore',
        'refactor',
        'test',
        'ci',
        'build',
        'perf',
        'style',
        'revert',
      ],
    ],
  },
};
