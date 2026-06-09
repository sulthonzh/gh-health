import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatText, formatJSON, formatMarkdown, parseArgs, HELP } from '../index.js';

describe('formatText', () => {
  it('shows all good for healthy repo', () => {
    const out = formatText([{ repo: 'myproj', score: 100, issues: [], files: ['README.md','LICENSE'], branches: ['main'], defaultBranch: 'main', updatedAt: new Date().toISOString(), daysSinceUpdate: 0, sizeKB: 100 }]);
    assert.ok(out.includes('myproj'));
    assert.ok(out.includes('All good!'));
    assert.ok(out.includes('100'));
  });

  it('shows issues for unhealthy repo', () => {
    const out = formatText([{ repo: 'badproj', score: 40, issues: [{ severity: 'critical', message: 'Missing README' }, { severity: 'warning', message: 'Missing LICENSE' }], files: [], branches: [], defaultBranch: 'main', updatedAt: new Date().toISOString(), daysSinceUpdate: 200, sizeKB: 50 }]);
    assert.ok(out.includes('Missing README'));
    assert.ok(out.includes('Missing LICENSE'));
    assert.ok(out.includes('40'));
  });

  it('shows average score', () => {
    const out = formatText([
      { repo: 'a', score: 80, issues: [], files: [], branches: [], defaultBranch: 'main', updatedAt: '', daysSinceUpdate: 0, sizeKB: 0 },
      { repo: 'b', score: 60, issues: [], files: [], branches: [], defaultBranch: 'main', updatedAt: '', daysSinceUpdate: 0, sizeKB: 0 },
    ]);
    assert.ok(out.includes('70/100'));
  });
});

describe('formatJSON', () => {
  it('outputs valid JSON with averageScore', () => {
    const out = formatJSON([{ repo: 'x', score: 90, issues: [], files: [], branches: [], defaultBranch: 'main', updatedAt: '', daysSinceUpdate: 0, sizeKB: 0 }]);
    const parsed = JSON.parse(out);
    assert.equal(parsed.averageScore, 90);
    assert.equal(parsed.repos.length, 1);
  });

  it('handles empty results', () => {
    const out = formatJSON([]);
    const parsed = JSON.parse(out);
    assert.equal(parsed.averageScore, 0);
  });
});

describe('formatMarkdown', () => {
  it('generates markdown table', () => {
    const out = formatMarkdown([{ repo: 'test', score: 85, issues: [{ severity: 'info', message: 'No CI' }], files: [], branches: [], defaultBranch: 'main', updatedAt: '', daysSinceUpdate: 0, sizeKB: 0 }]);
    assert.ok(out.includes('# GitHub Repo Health Report'));
    assert.ok(out.includes('test'));
    assert.ok(out.includes('No CI'));
    assert.ok(out.includes('|'));
  });

  it('shows None for clean repos', () => {
    const out = formatMarkdown([{ repo: 'clean', score: 100, issues: [], files: [], branches: [], defaultBranch: 'main', updatedAt: '', daysSinceUpdate: 0, sizeKB: 0 }]);
    assert.ok(out.includes('None'));
  });
});

describe('parseArgs', () => {
  it('parses --user', () => {
    assert.deepEqual(parseArgs(['node', 'cli', '--user', 'bob']), { user: 'bob', repo: null, json: false, markdown: false });
  });

  it('parses --repo', () => {
    assert.deepEqual(parseArgs(['node', 'cli', '--repo', 'owner/name']), { user: null, repo: 'owner/name', json: false, markdown: false });
  });

  it('parses --json', () => {
    assert.equal(parseArgs(['node', 'cli', '--json']).json, true);
  });

  it('parses --markdown', () => {
    assert.equal(parseArgs(['node', 'cli', '--markdown']).markdown, true);
  });

  it('parses --help', () => {
    assert.equal(parseArgs(['node', 'cli', '--help']).help, true);
  });

  it('defaults to nulls', () => {
    const args = parseArgs(['node', 'cli']);
    assert.equal(args.user, null);
    assert.equal(args.repo, null);
    assert.equal(args.json, false);
    assert.equal(args.markdown, false);
  });

  it('combines flags', () => {
    const args = parseArgs(['node', 'cli', '--user', 'alice', '--repo', 'myrepo', '--json']);
    assert.equal(args.user, 'alice');
    assert.equal(args.repo, 'myrepo');
    assert.equal(args.json, true);
  });
});

describe('HELP', () => {
  it('contains usage info', () => {
    assert.ok(HELP.includes('gh-health'));
    assert.ok(HELP.includes('--user'));
    assert.ok(HELP.includes('--json'));
    assert.ok(HELP.includes('--repo'));
  });
});
