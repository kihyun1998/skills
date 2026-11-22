# Attribution

Read in every contributor clone, and in a repository of the maintainer's own
where §4's answer turns Claude attribution off. The same pieces either way,
local either way, so nothing is imposed on anyone else working there.

Three pieces, because no one of them sees everything that leaves. The two hooks
run `scripts/no-attribution.mjs`, and `scripts/attribution-check.mjs` beside it
is the one copy of what is looked for; nothing written into the clone holds a
copy.

The **setting** stops the trailer and the PR footer where they are generated.
The **PreToolUse hook** checks what Claude sends — commands, including those a
shell is handed with `-c`, and GitHub MCP writes. The **`pre-push` git hook**
checks every push, from a script, an IDE or a person at the terminal.

## Installing them

One command writes all of it, and the same command with `--preview` writes
nothing and prints what it would write. Run it at the repository's root,
`<skill>` being this skill's folder:

```sh
node <skill>/scripts/grill-the-graph.mjs install --preview
node <skill>/scripts/grill-the-graph.mjs install
```

§5 shows the preview's output for approval and then runs `install`, so what was
shown and what is written come from one code path. *Update* runs the preview
again and shows each piece it marks `changed` as old text and new. What the
command does, so its output can be read:

- **`.claude/settings.local.json`** gets `attribution` with an empty `commit`
  and `pr`, and two `PreToolUse` matcher groups: one for Bash commands that
  start `git`, `gh` or `bash` and PowerShell commands that start `git`, `gh`,
  `pwsh` or `powershell`, one for GitHub MCP tools. Every key already there is kept; a hook that runs
  `no-attribution.mjs` is setup's, from an earlier run, and is replaced rather
  than added twice. A file that is not JSON stops it, since rewriting it would
  lose what it holds. Claude Code keeps that file out of every repository
  through the global git excludes, so it needs no exclude line of its own.
- **Each hook starts `node` with no shell** on the absolute path of
  `~/.claude/skills/grill-the-graph/scripts/no-attribution.mjs`, the home
  directory written out with forward slashes, because a hook started with no
  shell expands no `$HOME`. A script not at that path stops the command.
- **`"onFailure": "block"` makes each hook fail closed**: a hook that cannot
  start, exits with anything but 0 or 2, prints output Claude Code cannot read,
  or times out blocks the call, where it would otherwise let the command run. It
  needs Claude Code v2.1.295 or later, so the command reads `claude --version`
  first and prints the version it read; on an older one, or one it cannot read, it writes nothing, says why and
  exits 1, since there a hook that cannot start lets every command through.
- **`.git/hooks/pre-push`** is written executable, running
  `no-attribution.mjs --pre-push` through `$HOME`. Git runs it through its own
  `sh` on every platform. A missing `node` fails the `exec`, and a failed hook
  stops the push. **Where `core.hooksPath` is set or a `pre-push` of the
  project's own exists, it writes nothing there and prints why**: the project
  runs its own hooks, and replacing one is not setup's to do. A `pre-push` whose
  only line runs `no-attribution.mjs` is setup's, from an earlier run, and is
  rewritten.

What none of the three can see: a push made with Claude Code not running and no
git hook (`core.hooksPath` set), and an `ask` in a headless `-p` run, which
Claude Code turns into a deny.
