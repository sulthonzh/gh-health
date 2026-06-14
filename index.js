#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

function ghAvailable() {
  try { execSync('gh --version', { stdio: 'pipe' }); return true; }
  catch { return false; }
}

function fetchRepos(user) {
  const args = ['--limit', '500', '--json', 'name,updatedAt,hasWikiEnabled,isArchived,isFork,defaultBranchRef,diskUsage,isPrivate'];
  if (user) args.unshift('--user', user);
  else args.unshift('--json', 'name,updatedAt,hasWikiEnabled,isArchived,isFork,defaultBranchRef,diskUsage,isPrivate,owner');
  const raw = execSync(`gh repo list ${user ? user : ''} ${args.join(' ')}`, { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] }).trim();
  return JSON.parse(raw || '[]').filter(r => !r.isFork && !r.isArchived);
}

function fetchRepoFiles(owner, repo) {
  try {
    const out = execSync(`gh api repos/${owner}/${repo}/contents/`, { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
    return JSON.parse(out).map(f => f.name);
  } catch { return []; }
}

function fetchBranches(owner, repo) {
  try {
    const out = execSync(`gh api repos/${owner}/${repo}/branches --jq '.[].name'`, { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
    return out.trim().split('\n').filter(Boolean);
  } catch { return []; }
}

function fetchCIStatus(owner, repo, branch) {
  try {
    const out = execSync(`gh api repos/${owner}/${repo}/commits/${branch}/check-runs --jq '.check_runs[:3] | .[] | .status + " " + .conclusion'`, { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
    return out.trim();
  } catch { return ''; }
}

function checkHealth(repo, owner) {
  const files = fetchRepoFiles(owner, repo.name);
  const branches = fetchBranches(owner, repo.name);
  const defaultBranch = repo.defaultBranchRef?.name || 'main';
  const issues = [];

  const hasReadme = files.some(f => /^readme/i.test(f));
  if (!hasReadme) issues.push({ severity: 'critical', message: 'Missing README' });

  const hasLicense = files.some(f => /^license/i.test(f));
  if (!hasLicense) issues.push({ severity: 'warning', message: 'Missing LICENSE' });

  const hasCI = files.some(f => /\.(yml|yaml)$/i.test(f) && f.includes('work')) || files.includes('.github');
  if (!hasCI) issues.push({ severity: 'info', message: 'No CI config detected' });

  const hasGitignore = files.includes('.gitignore');
  if (!hasGitignore) issues.push({ severity: 'info', message: 'Missing .gitignore' });

  const hasPackageJson = files.includes('package.json');
  if (hasPackageJson) {
    try {
      const pkg = JSON.parse(execSync(`gh api repos/${owner}/${repo.name}/contents/package.json --jq '.content'`, { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] }));
      const content = Buffer.from(pkg, 'base64').toString('utf-8');
      const pkgObj = JSON.parse(content);
      if (!pkgObj.description) issues.push({ severity: 'info', message: 'package.json missing description' });
      if (!pkgObj.repository && !pkgObj.homepage) issues.push({ severity: 'info', message: 'package.json missing repository URL' });
    } catch { /* ignore */ }
  }

  const staleBranches = branches.filter(b => b !== defaultBranch);
  if (staleBranches.length > 3) issues.push({ severity: 'warning', message: `${staleBranches.length} non-default branches` });

  const daysSinceUpdate = Math.floor((Date.now() - new Date(repo.updatedAt)) / 86400000);
  if (daysSinceUpdate > 180) issues.push({ severity: 'info', message: `Not updated in ${daysSinceUpdate} days` });

  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'critical') score -= 30;
    else if (issue.severity === 'warning') score -= 15;
    else score -= 5;
  }

  return { repo: repo.name, score: Math.max(0, score), issues, files, branches, defaultBranch, updatedAt: repo.updatedAt, daysSinceUpdate, sizeKB: repo.diskUsage };
}

function formatText(results) {
  const lines = [];
  const sorted = [...results].sort((a, b) => a.score - b.score);
  for (const r of sorted) {
    const icon = r.score >= 80 ? '✅' : r.score >= 50 ? '⚠️' : '❌';
    lines.push(`${icon} ${r.repo} — score: ${r.score}`);
    for (const issue of r.issues) {
      const tag = issue.severity === 'critical' ? '!!' : issue.severity === 'warning' ? ' !' : ' .';
      lines.push(`   ${tag} ${issue.message}`);
    }
    if (r.issues.length === 0) lines.push('   All good!');
  }
  const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  lines.push('');
  lines.push(`Average health score: ${avg}/100 across ${results.length} repos`);
  return lines.join('\n');
}

function formatJSON(results) {
  const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  return JSON.stringify({ averageScore: avg, repos: results }, null, 2);
}

function formatMarkdown(results) {
  const lines = ['# GitHub Repo Health Report', ''];
  const sorted = [...results].sort((a, b) => a.score - b.score);
  lines.push('| Repo | Score | Issues |');
  lines.push('|------|-------|--------|');
  for (const r of sorted) {
    const issueList = r.issues.map(i => i.message).join(', ') || 'None';
    lines.push(`| ${r.repo} | ${r.score}/100 | ${issueList} |`);
  }
  const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  lines.push('');
  lines.push(`**Average score: ${avg}/100**`);
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { user: null, repo: null, json: false, markdown: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--user' && argv[i+1]) { args.user = argv[++i]; }
    else if (argv[i] === '--repo' && argv[i+1]) { args.repo = argv[++i]; }
    else if (argv[i] === '--json') { args.json = true; }
    else if (argv[i] === '--markdown') { args.markdown = true; }
    else if (argv[i] === '--help' || argv[i] === '-h') { args.help = true; }
  }
  return args;
}

const HELP = `gh-health — check the health of your GitHub repos

Usage: gh-health [options]

Options:
  --user <username>   Check another user's repos
  --repo <repo>       Check a single repo (format: owner/repo)
  --json              Output as JSON
  --markdown          Output as markdown table
  --help, -h          Show this help

Requires: gh CLI (authenticated)`;

module.exports = { ghAvailable, fetchRepos, fetchRepoFiles, fetchBranches, checkHealth, formatText, formatJSON, formatMarkdown, parseArgs, HELP };
