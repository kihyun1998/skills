# Windows notes

What this machine's Windows setup does that a script or a check run here has to
allow for.

## Telling whether a process opens a console window

Watch the visible top-level windows while the process runs. Its own
`MainWindowHandle` is not the answer. The console window a child opens is owned
by `WindowsTerminal` or `OpenConsole`, not by the child. So a child reads
`MainWindowHandle = 0` while its window is on the person's screen.

Measured in the #78 run (2026-11-20). #100's worker read `MainWindowHandle = 0`
for java and node spawned from a detached Node process and concluded that no
window opened. The person saw the windows. A watcher of visible top-level
windows then saw none during the Windows test set (265 java starts) once every
spawn passed `windowsHide: true`.

A Node process started with `detached: true` on Windows gets a console of its
own. Pass `windowsHide: true` to every `spawn`, `spawnSync`, `execFile` and
`execFileSync` a script makes.

## Codex's Windows sandboxes, as measured for check-it (#146)

`check-it` runs a Codex review in the `unelevated` sandbox with read-only
files and the network on (ADR-0102). The other two were measured on 2026-11-24
(codex-cli 0.171.0) and are not used:

- **MXC** needs no setup but refuses to change directory into a read-only
  tree, so `git diff` and `git status` fail in it.
- **elevated** needs a one-time setup from an elevated process (one UAC
  prompt): `Start-Process -FilePath cmd.exe -ArgumentList '/d','/c','codex
  sandbox setup --elevated --current-user' -Verb RunAs -Wait`. It creates
  sandbox users, firewall rules and local policy, and rewrites `[windows]
  sandbox` in `~/.codex/config.toml` to `"elevated"`. Its domain allowlist
  did not hold, and its sandbox user cannot read the person's profile, so
  `gh`, `glab` and a Node there do not start. It was set up on this machine
  during #146 and the config line put back to `"unelevated"`; `codex sandbox
  uninstall` removes the accounts and rules.

## Opening a file in the person's default viewer (#151)

`check-it.mjs open <file>` opens a file the way a double-click does. On
Windows it runs `powershell.exe -NoProfile -NonInteractive -Command` with
`System.Diagnostics.Process.Start` and `UseShellExecute = $true`. The path goes
in through the `CHECK_IT_OPEN` environment variable, so no quoting can change
the script. The spawn passes `windowsHide: true`.

Measured on 2026-11-25 (Windows 11 Pro 10.0.26200, Windows PowerShell 5.1):

- The default viewer for `.md` here is VS Code. The registry's
  `FileExts\.md\UserChoiceLatest\ProgId` is `VSCode.md`, whose open command
  is `Code.exe "%1"`.
- On a file that exists, the command returns exit 0 in about 0.5 to 0.7 s, and
  VS Code shows the file. While it ran, a watcher of visible top-level windows
  saw one new window, VS Code's own.
- On a path that does not exist, it returns exit 1 and prints
  `The system cannot find the file specified`. No window opens.
- PowerShell prints its own parse errors in the system's language (Korean
  here), so the script sets `[Console]::OutputEncoding` to UTF-8 before it
  prints a reason.

Whether a console window flashes is observed, not measured. At the first real
run (the #151 run, 2026-11-25), the conductor opened the findings report with
`check-it.mjs open` (exit 0) and the person saw no console window flash. No
measurement backs that up: the watcher of visible top-level windows saw no
window for the command, but it also saw none for a detached Node process spawned
without `windowsHide`, which the section above records as opening one in the
#78 run, nor for `cmd /c start`, which opens a new console by design. So the
watcher showed no console window in any case here, and why was not found.

`open` on macOS and `xdg-open` elsewhere are the commands the script runs off
Windows. Neither was run here.
