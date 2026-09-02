## Shell

For `exec_command` shell commands on Windows, prefer Cygwin Bash, via
`{"shell": "C:\\cygwin64\\bin\\bash.exe", "login": false}`
Use PowerShell only when the task specifically needs Windows-native shell behavior.

If you get a permission error such as `cannot open directory '.git': Permission denied`,
retry with `sandbox_permissions: "require_escalated"` and a narrow justification.

## Dangerous Actions

Do not take actions that affect the outside world without explicit permission.
For example:

* Do not `git push`.
* Do not write/edit GitHub posts. When I ask for posts, I usually want draft text that I can revise and submit myself.

## Writing

When drafting user-facing prose:

* Write concisely. Use few words while preserving meaning. Avoid repeating yourself.
* Don't say "lowering" when you mean "transpiling" or "compiling".
