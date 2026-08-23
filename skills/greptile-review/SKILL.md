---
name: greptile-review
description: Run and inspect Greptile CLI code reviews in the current Git repository. Use when the user asks to "do a Greptile review," "run a Greptile review," "look at the latest Greptile review," view Greptile findings, or otherwise requests Greptile review output.
---

# Greptile Review

Run Greptile commands from the current repository's root. Report command or authentication failures clearly instead of guessing results.

## Start a review

When asked to do or run a Greptile review:

1. Run `git status --porcelain` to check for staged, unstaged, or untracked changes.
2. If the working tree is dirty, explain that `greptile review --agent` reviews only existing commits and ask whether to commit the relevant changes first.
   - Do not create a commit without confirmation.
   - If the user declines, explain that the review will cover the current `HEAD` and exclude uncommitted changes.
3. Once the commit state is settled, tell the user that starting the review commonly takes several minutes, then run `greptile review --agent`.
   - Allow the command to finish and keep the user updated while it runs.
   - Do not treat quiet output as failure or rerun the command solely because it is taking several minutes.
4. Report the resulting review ID, status, and relevant output.

## Show the latest review

When asked to look at the latest Greptile review:

1. Run `greptile review show --json`.
2. Flatten the returned `reviews` arrays and select the entry with the newest
   `createdAt` value. Its `runId` is the exact review ID; `headSha` and the short
   commit hash shown in plain listings are not accepted as review IDs.
3. Run `greptile review show --agent <runId>`.
4. Present the review findings clearly.

If the JSON contains no reviews, say so instead of constructing an ID.
