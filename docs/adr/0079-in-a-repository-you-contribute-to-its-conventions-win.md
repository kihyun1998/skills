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

## Why a hook, and why both layers

The `attribution` setting stops the commit trailer and the PR footer where they
are generated. It does not reach issue or PR comments, prose in a body, or a
branch name, so a PreToolUse hook checks what leaves: `git commit`, `git push`
(the commits in range and the branch name), `gh pr`/`gh issue` create, edit and
comment, and `gh api`. Trailers, the generated-with footer and `claude/` branches
are blocked; a Claude or AI mention in prose asks, because a project about AI
makes that pattern fire on honest text. Both live in `.claude/settings.local.json`,
which Claude Code adds to the global git excludes.

The hook script is one copy under `grill-the-graph/`, referenced by path, so a
pattern fixed once is fixed in every clone. It is node, and it fails loudly when
node is missing rather than passing unchecked.

## Considered and not taken

- **A local-only map.** It would help the maintainer and hide the why from the
  reviewers who need it.
- **Surviving worktrees.** Untracked files do not follow `git worktree add`, and
  the Claude Code docs say the same of `CLAUDE.local.md`. Contributor work is
  assumed to run in one clone; the workaround (a path in the git common dir) would
  move the build file and break `read-it` and `check-it`.
- **The hook deciding the mode itself.** It runs only where setup installed it,
  so a second copy of the verdict would be one nothing keeps in step.
