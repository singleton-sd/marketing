const { execSync } = require('child_process');

const getGitBranch = () => {
  try {
    return execSync('git symbolic-ref --short HEAD').toString().trim();
  } catch {
    return '';
  }
};

const getTicketNumberFromBranch = (branchName) => {
  const match = branchName.match(/feature\/(MKT-\d{1,5})/i);
  return match ? match[1].toUpperCase() : null;
};

const getTicketNumberFromCommit = (commitMessage) => {
  const match = commitMessage.match(/:\s*(MKT-\d{1,5})\b/i);
  return match ? match[1].toUpperCase() : null;
};

module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'ticket-number': ({ header }) => {
          if (header.includes('Release')) {
            return [true];
          }
          const fromCommit = getTicketNumberFromCommit(header);
          const fromBranch = getTicketNumberFromBranch(getGitBranch());
          if (fromCommit || fromBranch) {
            return [true];
          }
          return [
            false,
            'Commit subject must include MKT-<n> (or branch feature/MKT-<n>-...)',
          ];
        },
      },
    },
  ],
  rules: {
    'header-max-length': [2, 'always', 72],
    'subject-case': [0],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'chore', 'refactor', 'test', 'ci', 'build', 'perf', 'style', 'revert'],
    ],
    'ticket-number': [2, 'always'],
  },
};
