---
name: assay
description: "Review a change along two axes that are kept apart on purpose: does the code hold up, and does it do what was asked. The first carries this repo's documented standards plus a fixed baseline of code smells — cohesion, coupling, duplication — and opens the module the change landed in rather than judging the hunk alone. The second asks what the issue wanted and got, what it wanted and did not, and what arrived that nobody asked for. Findings are graded and never merged across axes. Use before calling a change done, or on any diff worth a second read."
---

# assay — test what the change is made of

Two questions about one diff, asked separately:

- **Does the code hold up?** — against what this repo has written down, and against
  a fixed baseline of shapes that go wrong.
- **Does it do what was asked?** — against the issue that started it.

**They are kept apart because a change can pass one and fail the other.** Code
that follows every convention and implements the wrong thing passes the first and
fails the second; code that does exactly what the ticket said while breaking the
project's shape does the reverse. Reported together, one hides the other.

## The starting point

The diff is **everything since the branch left its base** —
`git diff <base>...HEAD`, three dots, so the comparison is against the merge-base
and not against whatever else landed on the trunk meanwhile.

**Do not ask which base.** Where this runs inside a change, the caller already
knows it. Run standalone with no obvious base, ask once; then confirm the ref
resolves and the diff is non-empty **before** anything else starts, so a bad ref
fails here rather than inside two readers.

## What each axis reads

### Does the code hold up

Two sources, and the first outranks the second.

**What this repo has written down** — `CLAUDE.md`, `CONTEXT.md`, a coding-standards
or contributing document, the decision records. A repo standard **always wins**:
where it endorses something the baseline below would flag, the baseline is
silent.

**And a fixed baseline that applies even where a repo has written nothing** —
these are Fowler's code smells (*Refactoring*, ch. 3), each a **labelled
heuristic**, never a hard violation. Skip anything the tooling already enforces.

| Smell | What it is | Where it goes |
|---|---|---|
| **Divergent Change** | one module edited for several unrelated reasons | split so each module changes for one reason |
| **Shotgun Surgery** | one logical change forces edits scattered across many files | gather what changes together into one module |
| **Feature Envy** | a function reaching into another object's data more than its own | move it onto the data it envies |
| **Duplicated Code** | the same logic shape in more than one hunk or file | extract it, call it from both |
| **Data Clumps** | the same few fields keep travelling together | a type wanting to be born — bundle them |
| **Primitive Obsession** | a string or number standing in for a domain concept | give the concept its own small type |
| **Repeated Switches** | the same cascade on the same type, in several places | polymorphism, or one map both sites share |
| **Message Chains** | `a.b().c().d()` the caller should not depend on | hide the walk behind one method on the first object |
| **Middle Man** | a class or function that mostly delegates onward | cut it, call the real target |
| **Speculative Generality** | abstraction or hooks for needs nothing has | delete it; inline back until a real need shows |
| **Refused Bequest** | an implementer ignoring most of what it inherits | composition instead of inheritance |
| **Mysterious Name** | a name that does not say what the thing does or holds | rename it; if no honest name comes, the design is murky |

**Open the module, not just the hunk.** *"Edited for several unrelated reasons"*
and *"reaching into another object's data"* are claims about a module, and a diff
shows you a slice of one. After reading the hunks, open the files they landed in
and ask two things: **does this module still change for one reason**, and **did
this change make it reach further into somebody else's data.**

Stop at the modules the diff touched. Whether the repository's architecture wants
rethinking is `improve-codebase-architecture`'s question, not this one's, and
widening into it turns a review into a redesign nobody asked for.

### Does it do what was asked

The issue or spec that started the change. Where this runs inside a change the
caller already read it and passes it in; standalone, look for it in the commit
messages' issue references, then in a path given as an argument, then under the
usual spec directories. **If there is no spec, skip this axis and say so** — a
review that quietly drops half of itself reads as a review that passed.

Three questions, and the third is the one that gets missed:

- **What did it ask for that is missing or only partly there?**
- **What arrived that nobody asked for?** Scope that crept in is not a bonus; it
  is behaviour nobody specified and nobody will remember agreeing to.
- **What looks implemented but implemented wrongly?** The requirement is met on
  paper and the code does something else.

Quote the line of the spec each finding rests on.

## Grade each finding

| Grade | What it means | What it costs the reader |
|---|---|---|
| **violation** | breaks something this repo wrote down. Cite the file and the rule | fix it, or change the rule on purpose |
| **judgement** | a baseline smell, or a spec reading that could go either way | a look, and often a shrug |
| **already decided** | a decision record settled this | one line of acknowledgement |

**The third grade is why the records get read.** A finding that contradicts a
recorded decision is not a defect — it is the record doing its job — and
reporting it as one re-opens a call somebody already made. Where the record
exists but the change contradicts it *without saying so*, that is a **violation**
and a loud one.

## Reading and reporting

**Two readers, one per axis, run at the same time.** Each gets the **whole** diff.
This is not splitting the material — they are asked different questions about the
same thing, which is the opposite of dividing a corpus between two readers who
then each know half.

Give each reader its axis's sources, the diff, and a length limit; the smell
table has to be handed over in full, since a reader has no other access to it.

**Report the two axes under their own headings and do not merge them.** No
combined list, no single ranked order, and **no picking a worst finding across
both** — that reranking is exactly what keeping them apart prevents.

Close with one line per axis: how many findings, and the worst one **within that
axis**. Two lines, never one.

**A clean axis is a result.** Report it as clean, with what was read, rather than
leaving it out.
