# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Relations

`spine`'s decider is `code` because the cluster roster is a **relation query**,
not a body parse. GitHub renders two relations natively and both are reachable
from `gh`. **What was verified, and what was not**, checked against this repo on
2026-08-30: every *read* below was run against this repo, and where the output is
short it is pasted beside the call. The two
**POST** calls were **not** run then — writing a relation to make a document true
is a side effect nobody asked for — so their flag names and paths were stated
from the API alone.

**Both POSTs have since been run** (2026-09-01, filing the #39 cluster). The paths
and flag names above were correct as written. Two things the API reference did not
say, measured from the responses:

- `POST …/issues/<parent>/sub_issues` returns the **parent** issue object, not the
  child. Reading `.number` back gives you the parent you already had, so it
  confirms nothing about which child was enrolled — verify with the roster read
  below instead.
- `POST …/issues/<n>/dependencies/blocked_by` returns the **blocked** issue.

The counters are also no longer all zero, so the open-versus-closed question below
is now answerable by closing a blocker and re-reading.

**Every relation call takes a database id, never an issue number.** They are
different numbers on the same issue — `#17` is `5291441561` here — and passing
the number reaches a different issue or none at all, with no error that says so.
Resolve it first:

```sh
gh api repos/<owner>/<repo>/issues/<n> --jq .id
```

**Parent / child (sub-issues).** This is the relation `spine` reads as the
roster and `batch` uses to parent a follow-up in the same act as filing it.

```sh
# enroll <child> under <parent>
gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues \
  -F sub_issue_id=<child-db-id>

# read the roster
gh api repos/<owner>/<repo>/issues/<parent>/sub_issues \
  --jq '.[] | "\(.number) [\(.state)] \(.title)"'
```

**Blocking (issue dependencies).** Distinct from parent/child: a ticket may be
blocked by a sibling it is not a child of.

```sh
gh api --method POST repos/<owner>/<repo>/issues/<n>/dependencies/blocked_by \
  -F issue_id=<blocker-db-id>
```

Each issue carries a live summary, which is what makes "unblocked" a query
rather than a reading:

```sh
gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary
# {"blocked_by":0,"blocking":0,"total_blocked_by":0,"total_blocking":0}
```

`blocked_by` counts open blockers only, so zero means takeable now. **Now
demonstrated** (2026-09-01): #41 and #42 were each blocked by #40, and closing
#40 gave both

```
{"blocked_by":0,"blocking":0,"total_blocked_by":1,"total_blocking":0}
```

`blocked_by` fell to zero while `total_blocked_by` stayed at one. That is the
pair that makes the summary usable without a second read: **`blocked_by` is the
takeable-now query, `total_blocked_by` is the relation roster.** Reading only the
second would report a finished cluster as still blocked forever.

## Tracker capability

**This file holds the contract.** It held it, handed it to the build, and has it
back — the build was retired by
[ADR-0065](../adr/0065-this-repos-thegraph-build-is-retired.md) and a contract
whose only home was a deleted file is a contract nobody has.

**GitHub Issues via the `gh` CLI**, and **both relations are native** — verified
against this repo on 2026-08-30.

- **Parent/child (sub-issues)** — `spine` reads the roster as a relation query,
  and `envelope` parents a follow-up in the same act as filing it. Neither falls
  back to prose.
- **Blocking (dependencies)** — distinct from parent/child; a ticket may be
  blocked by a sibling it is not a child of.

**Every relation call takes a database id, never an issue number.** Passing the
number reaches a different issue or none at all, with no error that says so.
Resolve with `gh api repos/<owner>/<repo>/issues/<n> --jq .id`.

The two **POST** calls were stated from the API and not run when the build was
written; both have since been run (2026-09-01), and what the responses measured
that the API reference did not say is below.

**This round trip is the record worth keeping.** The paragraph that first sat
here said *"this repo has no build, so there is no build to hold the answer yet"*
and promised to hand the value over when one existed. The build arrived, took the
value, and nothing came back for the promise — a placeholder outliving the thing
it stood in for, in a file no `sweep` surface watched. Then the build was retired
and the pointer became a link to nothing. **A value that moves to a generated
artifact moves somewhere with a shorter life than the fact it carries**, which is
the reason it now lives here and is not delegated again.
