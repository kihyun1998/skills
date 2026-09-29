# ADR-0072 — `blog-it` lives here, its command lives in the blog

**Status:** accepted.

`blog-it` joins this catalog. The `jblog` CLI it calls stays in the blog's own
repository, where it already is. The two artifacts of one feature are split
across two repositories on purpose.

## The criterion is where the gate is, not what the feature is

Both halves were specified together, in the blog repo's spec issue. Splitting
them looks like inconsistency; it is the same rule applied twice.

**Prose is placed by discoverability.** A skill has to be found by Claude Code
in whatever repository the author happens to be in, and this is the catalog the
installers link into `~/.claude/skills`. A project-scoped copy in the blog's
`.claude/skills/` — where its two sibling skills live — cannot answer anywhere
else, which is the one thing this skill exists to do.

**Code is placed by what it reddens with.** `jblog` imports four things from the
blog that it must not carry a second copy of: the site's address, the claim
decoder, the sign-in provider union, and the Supabase configuration. It also
respects contracts — slug intent, the paired tag fields, the required language —
that are enforced and tested in that repository. There, a change to a contract
and a change to the command are the same commit and the same suite. Here, they
would be neither.

Moving the command into this catalog to keep the feature together would produce
four copied values and a hundred tests with no home. Publishing it to a registry
was already rejected upstream, for reasons that have not changed at a user count
of one.

## What the split costs, and what was done about it

Nothing checks the two halves against each other. A `jblog` change can falsify
this skill's prose and nothing here goes red.

That is not mitigated by care; it is mitigated by **narrowing what the prose has
to know**. Three facts were about to be written into this file:

| About to be copied here | Now |
|---|---|
| the tone notes' absolute path in a checkout | `jblog voice` |
| the site's address | `jblog vocab`, `jblog post create` |
| which endpoints hold the categories and tags | `jblog vocab` |

Two read-only commands were added to the blog's CLI for exactly this, and they
are tested there — including the assertion that the tone notes' path does not
come from the working directory, since the caller is by definition somewhere
else. What remains written down here is **one name**.

## No dependency row, and that is not an oversight

`jblog` is a command, not a skill. It is declared in `blog-it`'s own prose,
which is where the other CLI dependencies in this catalog are declared, and it
gets no row in [`skill-dependencies.md`](../agents/skill-dependencies.md) — that
file answers *"where does a skill name that is not in this catalog come from?"*,
and this is not a skill name. It gets no `requires:` either: that key declares
skills this one invokes, and it invokes none.

## What would show this was wrong

- **This file, or the skill, describing the blog's contracts.** Required fields,
  slug rules, tag pairing — if any of them appears here, the narrowing failed and
  the copy is back.
- **A `jblog` change breaking the skill with nothing red anywhere.** The cost was
  accepted on the claim that one command name is a small enough surface to keep
  true by hand. One instance is evidence the surface is not small enough.
- **A second consumer of `jblog` appearing outside the blog.** Two callers make
  the command a published interface, at which point the registry question that
  was closed upstream reopens on new facts.
