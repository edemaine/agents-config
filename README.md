# Agents/Codex configuration

This is a portion of Erik Demaine's `.codex` directory.

## `AGENTS.md`

[`AGENTS.md`](AGENTS.md) gives Codex two global instructions:

- On Windows, prefer Cygwin Bash for shell commands.
- Never run `git push`. I prefer to be in control of changes to the outside world.

## Skills

This repository includes personal skills for:

- [Annotated diffs](skills/annotated-diff/) for code review.
- [Greptile CLI reviews](skills/greptile-review/).
- [Proofreading papers](skills/proofread/).

## Bootstrap an existing `.codex` directory

```bash
cd ~/.codex
git init -b main
git remote add origin git@github.com:edemaine/agents-config.git
git fetch origin

# Establish the remote as the baseline and populate its tracked files.
git reset origin/main
git restore .
git branch --set-upstream-to=origin/main main

git status
git diff
```
