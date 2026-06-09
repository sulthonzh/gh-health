#!/usr/bin/env node
'use strict';
const { ghAvailable, fetchRepos, checkHealth, formatText, formatJSON, formatMarkdown, parseArgs, HELP } = require('./index');

const args = parseArgs(process.argv);
if (args.help) { console.log(HELP); process.exit(0); }
if (!ghAvailable()) { console.error('gh CLI not found or not authenticated. Run: gh auth login'); process.exit(2); }

try {
  const user = args.user || JSON.parse(require('child_process').execSync('gh api user --jq ".login"', { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] })).trim();
  if (args.repo) {
    const [owner, name] = args.repo.includes('/') ? args.repo.split('/') : [user, args.repo];
    const fakeRepo = { name, updatedAt: new Date().toISOString(), defaultBranchRef: { name: 'main' }, diskUsage: 0, isFork: false, isArchived: false };
    const result = checkHealth(fakeRepo, owner);
    const output = args.json ? formatJSON([result]) : args.markdown ? formatMarkdown([result]) : formatText([result]);
    console.log(output);
  } else {
    const repos = fetchRepos(args.user);
    if (!repos.length) { console.log('No repos found.'); process.exit(0); }
    const results = repos.map(r => checkHealth(r, user));
    const output = args.json ? formatJSON(results) : args.markdown ? formatMarkdown(results) : formatText(results);
    console.log(output);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(2);
}
