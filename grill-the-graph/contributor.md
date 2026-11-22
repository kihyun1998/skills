# Contributor mode

Read when the mode is contributor mode (*The mode comes first* in
[SKILL.md](SKILL.md)): this is what setup writes in someone else's repository in
place of the default's pieces.

A repository whose PRs land in someone else's repository. Its own guidance and
merged PRs decide how code and comments are written there, and nothing setup
writes may land in it.
[ADR-0079](../docs/adr/0079-in-a-repository-you-contribute-to-its-conventions-win.md)
holds the reasons, including why the rule below overrides
[ADR-0076](../docs/adr/0076-a-comment-says-what-the-code-is.md) entirely.

| | Default | Contributor mode |
|---|---|---|
| Build file | `docs/agents/thegraph.md` | same path, listed in `.git/info/exclude` |
| Comment rule | `CLAUDE.md`, from §3's table | `CLAUDE.local.md`, listed in `.git/info/exclude`, the text below |
| Map | §3 makes its folder | none, and the closing report does not name `grill-map` |
| Attribution | kept, unless the maintainer turns it off at §4 | always off: `.claude/settings.local.json` and `.git/hooks/pre-push`, installed as [attribution.md](attribution.md) says |

The build file keeps its path, so `read-it` and `check-it` find it unchanged. One
clone is assumed: untracked files, `CLAUDE.local.md` included, do not follow
`git worktree add`.

**The comment rule names no file**, because upstream's guidance can arrive
mid-run — a style guide merged between approval and rebase is one a copied list
misses:

> Comments follow this repository, not a rule written here. Before writing one,
> find and read its contributor and style guidance, at the root and under
> `docs/`, and the closest merged PR touching the same file, and do what they
> do — where the why goes included. Read them again on every run; they change.

`comment-it` reads this rule as contributor mode and does not run.
