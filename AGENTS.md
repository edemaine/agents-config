For `exec_command` shell commands on Windows, prefer Cygwin Bash, via
`{"shell": "C:\\cygwin64\\bin\\bash.exe", "login": false}`
Use PowerShell only when the task specifically needs Windows-native shell behavior.

If you get a permission error such as `cannot open directory '.git': Permission denied`,
retry with `sandbox_permissions: "require_escalated"` and a narrow justification.

Never run `git push`
