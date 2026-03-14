---
name: git-push
disable-model-invocation: true
---

# Git Push

## Workflow

1. Check the current branch, remote status, and `origin` URL
2. If the branch has no upstream, run `git push -u origin {branch}`
3. Otherwise push the current branch to `origin`
4. Report the remote branch and link

## Rules

1. Use only after an explicit user request to push.
2. Do not create commits. Commit is handled by the separate `git-commit` skill.
3. Do not create MR or PR.
4. If there are no local commits to push, explain and stop.
5. If push is rejected, report the git error and stop.

## Output Format

After successful push:

```text
✓ Push: origin/{branch}

Ветка: {url}
```

## Branch URL

Construct the branch URL from `git remote get-url origin`:

- GitLab: `{base}/-/tree/{branch}` where `base` is the repo URL without `.git`
- GitHub: `{base}/tree/{branch}`
