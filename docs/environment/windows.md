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
