# ADR-0079 — In a repository you contribute to, its conventions win and setup leaves no trace

**Status:** accepted.

[ADR-0076](0076-a-comment-says-what-the-code-is.md) holds in repositories the
maintainer owns. In one whose PRs land in someone else's repository —
**contributor mode** — `grill-the-graph` commits nothing, and the comment rule it
writes defers to that repository's own guidance and its merged PRs instead of
restating 0076. Commits, PR bodies, comments and branch names pushed there carry
no Claude attribution, and a hook checks it rather than a memory asking for it.

## Why 0076 does not travel

0076's measurements came from five repositories that keep maps the maintainer
wrote. An upstream that never chose that policy owes it nothing, and its
reviewers cannot see a map that lives only in a local clone. On Devolutions/sspi-rs
(2026-10-06/07) the 0076 rule written at setup said the why goes to the commit or
the PR; upstream puts the why and an issue reference in doc comments (#719), and
the rule had to be overridden mid-run. **Even the first sentence — a comment says
what the code is — yields**, because that sentence is the part sspi-rs disagrees
with.

## Why the rule names no files

`AGENTS.md`, `STYLE.md` and a style-review skill were merged upstream (#763)
between approval and rebase, and `STYLE.md` required a change to the open PR. A
rule listing the files found at setup would have missed both. The rule says to
find and read the guidance and the closest merged PR on every run.

## How the mode is decided

`viewerPermission` on **the repository that receives the PRs** — the `parent`
when the default repository is a fork. Asked of the default repository, a clone
whose `origin` is the maintainer's fork reads `ADMIN` and gets owner mode.
`READ` or `TRIAGE` selects contributor mode by default. `WRITE` is not decided by
permission at all — whether a team accepts `docs/agents/` commits is something a
person knows — so §5 shows the verdict and the maintainer can flip it.

## Why three layers

The `attribution` setting stops the commit trailer and the PR footer where they
are generated. It does not reach issue or PR comments, prose in a body, or a
branch name, so a PreToolUse hook checks what Claude sends — the commits and
branch names a push carries, including the push `gh pr create` makes itself, the
text of commits, tags, PRs, issues, releases and API writes, commands a shell is
handed with `-c`, and GitHub MCP writes. Which commands that covers is the
script's, not this record's. Trailers, the generated-with footer and `claude/`
branches are blocked; a Claude or AI mention in prose asks, because a project
about AI makes that pattern fire on honest text. Both live in
`.claude/settings.local.json`, which Claude Code adds to the global git excludes.

The PreToolUse hook sees only Claude's own tool calls, so a `pre-push` git hook
runs the same check on every push — a script, an IDE, a person at the terminal.
It is untracked like the rest. Where the project sets `core.hooksPath` or has
its own `pre-push`, setup writes none: replacing a project's hooks is not its to
do, and that clone keeps the gap.

The script is one copy under `grill-the-graph/`, referenced by path, so a
pattern fixed once is fixed in every clone. It is node, and every failure blocks:
the hook command ends in an exit-2 tail, because a PreToolUse hook that exits 1,
or whose `node` is missing, lets the command run. On Windows without Git Bash the
same tail is written for PowerShell. A clone with no remote-tracking ref is
refused rather than read whole, since then every upstream commit reads as new.

What stays open: a PreToolUse hook that times out lets the call through, and in a
headless `-p` run an ask becomes a deny.

## `decant` follows upstream too

In a contributor clone `decant` holds **the comments the branch adds or changes**
to upstream's guidance and closest merged PR, with no map and no ADR-0076 bins.
The alternatives were to stop with a reason, or to leave `decant` alone because a
person invokes it. Stopping left the branch's own comments unchecked against the
very guidance this record says wins; the whole tree was rejected because
upstream's existing comments are not a contributor's PR to change.

## Considered and not taken

- **A local-only map.** It would help the maintainer and hide the why from the
  reviewers who need it.
- **Surviving worktrees.** Untracked files do not follow `git worktree add`, and
  the Claude Code docs say the same of `CLAUDE.local.md`. Contributor work is
  assumed to run in one clone; the workaround (a path in the git common dir) would
  move the build file and break `read-it` and `check-it`.
- **The hook deciding the mode itself.** It runs only where setup installed it,
  so a second copy of the verdict would be one nothing keeps in step.
