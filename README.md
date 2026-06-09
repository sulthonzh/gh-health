# gh-health

Check the health of your GitHub repos — README, LICENSE, CI config, stale branches, and more.

Uses `gh` CLI under the hood. No API tokens needed — just your existing GitHub auth.

## Why

When you have dozens of repos, it's easy to forget which ones are missing a LICENSE, don't have CI set up, or haven't been touched in months. `gh-health` scans them all and gives you a score.

## Install

```bash
npm install -g gh-health
```

Or just run it directly:

```bash
npx gh-health
```

## Usage

```bash
# Check all your repos
gh-health

# Check a specific repo
gh-health --repo owner/repo

# Check another user's repos
gh-health --user torvalds

# JSON output
gh-health --json

# Markdown table
gh-health --markdown
```

## What it checks

| Check | Severity | Points |
|-------|----------|--------|
| Missing README | Critical | -30 |
| Missing LICENSE | Warning | -15 |
| No CI config | Info | -5 |
| Missing .gitignore | Info | -5 |
| package.json missing description | Info | -5 |
| package.json missing repo URL | Info | -5 |
| Too many stale branches (>3) | Warning | -15 |
| Not updated in 180+ days | Info | -5 |

Every repo starts at 100. Penalties get subtracted. The result is a per-repo health score.

## Output

```
✅ my-cool-project — score: 100
   All good!

⚠️ old-tool — score: 70
    ! Missing LICENSE
   . No CI config detected
   . Not updated in 250 days

❌ abandoned-repo — score: 30
   !! Missing README
    ! Missing LICENSE
   . Missing .gitignore
   . Not updated in 400 days

Average health score: 67/100 across 3 repos
```

## Requirements

- [gh CLI](https://cli.github.com/) installed and authenticated
- Node.js 18+

## License

MIT
