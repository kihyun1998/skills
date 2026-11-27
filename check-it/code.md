# check-it — where the change compiles or runs

Read this where the change compiles or runs, or where `comment-it` ran.

## Cost (10) and comments (9)

**Cost (10)**: no defect without a number. A slowdown that was measured, with
something to compare it against, is a defect. A shape nobody measured is a
question, and it is asked as one. **Read [benchmark.md](benchmark.md) when** the
change claims a performance effect, a review flags a possible slowdown, or the
repository's build guidance names the path as needing a benchmark; otherwise it
is not read. The reviews run beside this check, so where a finding of theirs is
the first to flag a slowdown, run (10) again with the method once it arrives.

**Comments (9)** come back as findings, and go into the report. A finding the
person keeps is fixed in this change, through `make-it`: a comment outside the
repository's list is deleted; where it explained a workaround or a surprise in
this repository's own code, the code is fixed instead, and a fix outside this
change's scope is carried to `ask-it`, never written back as a comment. A
constraint on our own code — *do not remove*, *talk to X first* — is deleted and
carried to `ask-it` as a check candidate for `encode-it`. A suppression of a
correctness or safety rule is fixed through `make-it`. A report of contributor
mode or of a missing rule is passed on as it came.

## Proving it works

**First, the run's `stand-ins` line**, `read-it`'s, on the run sheet or in a
`thegraph-herdr` worker's brief. A stand-in there that reaches the real thing
this change touched, as its *measures* and *cannot reach* say, goes into
`check-it`'s one question as an option, headless or not, put as `ask-it`'s
*Before an item goes out unmeasured* says, and runs only when picked; it is
not reported as chosen and not run.

**Then start from the way to the real thing the repository already records.** The
build's references (`docs/agents/thegraph.md`) and the territory map can name
one: a real machine and a procedure for comparing against another client, a
black-box judge, a harness note. Use what reaches what this change touched,
within what its record says it proves, before working out a proof of your own,
and report which one was used, or why none applied. One that needs a machine,
another client or server, an OS, or a person to drive it, none of them reachable
here, is reported as chosen and not run, and the run goes on with the proof it
can reach.

**A fake backend or a demo is a smoke test, not proof.** A fake can pass while
the real thing differs, and the whole reason to reach past it is that the
difference is exactly where the bugs are.

Two traps, both of which look green:

- **A headless run proves only what it consumed.** Where a change has a visible
  or structural effect — focus, scroll, reveal, a rendered value — a run
  asserting only the proxy it happened to read has not verified the effect.
  Assert the state directly, or drive the real thing.
- **A check that can only confirm what it assumes.** A fixture produced or
  normalised by the thing it grades, or a measurement that misreads itself the
  same way the code does, agrees with anything. Nothing lists this project's
  own; name each one **in the decision record it belongs to** as you meet it.

**A lane the repository already runs is something real**, unless it takes its
expected value from the code it grades. A fuzz target or property that covers
the changed code, run against the change, or a kept input replayed against it,
is evidence a hand-written example is not. Where the change added a case to such
a lane, check that it was watched failing (`make-it`); where it touched covered
code and added none, say so.

**The strongest proof runs in a real consumer.** A consumer cloned or built for
it follows [`clean-it`'s rules](../clean-it/RULES.md). Link this build into something
that actually uses it and run **its** suite. The best evidence there is a
consumer test that had **pinned the old bug as its expected value and is now
failing** — a symptom somebody else independently observed and froze has
disappeared.

**And the artifact a proof reads from needs the same gate the tests got.** A
recorded fixture, golden or capture that cannot fail reads as coverage and proves
nothing. Put it through `make-it`'s test bar, mutated until the assertion that
reads it goes red, not just the assertion itself.
