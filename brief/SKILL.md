---
name: brief
requires: [artifact-design]
disable-model-invocation: true
description: "Explain the work in flight to the person who has to decide about it, as a one-screen Artifact. /brief, /brief <issue> or /brief session."
---

# brief — explain the work to the person who has to decide

The user is fluent in their product and not in your vocabulary. This skill exists for the moment
that gap stops the work: they cannot tell what state things are in, what you are proposing, or what
it costs them to say yes.

**It is invoked, never automatic.** Judging whether someone understands you is not yours to do — you
will over-fire and become ritual, or under-fire and never know. They know when they are lost; the
skill is what they reach for. Do not offer it as a substitute for writing clearly the first time.

## Scope

| Invocation | Briefs on |
|---|---|
| `/brief` | **the work in flight** — the default, and the one to design for |
| `/brief <issue>` | one issue or PR |
| `/brief session` | what this session did, as a recap |

The bare form has to work with no argument, because someone who is lost has no attention left to
spend specifying a scope.

## Where the facts come from

**Status is queried. Intent comes from the conversation.**

- **Status** — merged, closed, released, CI, version: read it with `gh` / `git` and report only what
  the output showed. Never copy a status claim out of the conversation, including your own: a
  briefing that says "merged" when it is not is worse than no briefing, and you are the most likely
  source of that error.
- **Intent** — what you are about to do, why, what it affects: this only exists in the conversation.
  Take it from there, and **mark what was measured apart from what was inferred.** "We measured
  this" is the sentence that makes a briefing trustworthy; using it for something you reasoned your
  way to destroys that in one move.

## The sections

**Four are mandatory and render even when empty.**

1. **상황** — where things stand. Anchor it in what is done, not in what is planned.
2. **뭘 하겠다는 건지** — the next action, in one sentence a person could repeat back.
3. **영향** — what changes. **This section must state what does *not* change**, and state it first
   where that is the bigger part. A list of only-the-changes reads as danger; most work leaves most
   things alone, and saying so is the point of the section.
4. **결정할 것** — what you need from them. **"결정할 것: 없음" is information, not an empty
   section** — half the anxiety is "is something waiting on me?", and answering no ends it. Each
   decision gets its options, your recommendation, and what happens if they pick each one.

**Two are conditional and disappear entirely when they have nothing:**

5. **왜 확신하나** — only when something was actually measured. Give the numbers.
6. **안 하기로 한 것** — only when an alternative was really considered and rejected. Without it,
   "why didn't you just do X?" arrives later, when it is expensive to answer.

Do not pad a conditional section to fill the layout. A template that is always six sections becomes
six sections of nothing.

## Language

**Every noun must point at something they can see or do.**

That test, not a list of forbidden words, is the working rule — a list only catches the words that
already lost someone, and the ones that lose them next time are different. You do not experience your
own vocabulary as difficult, which is exactly why the check has to be structural.

| Fails the test | Passes |
|---|---|
| "the spine's hypothesis" | "the guess we wrote down" — or cut it |
| "a conformance item" | "the next piece of this" |
| "#592" *as the subject* | "stop the cursor blinking while typing Korean" |
| "Step 4 proof" | "we checked it in a real browser" |

**Numbers and links stay, but subordinate.** Name things by what they do; put the issue or PR number
in a small label or a closing line. They cannot say "merge it" if the briefing never says which one —
the briefing is a **door**, not a replacement.

Keep a running list of the words that actually lost this user, as a **record rather than a rule**:
it explains why the check exists and it grows from real failures instead of guesses.

## This is a view, not a source

**Nothing may exist only in a briefing.** Every decision, measurement, rejected alternative and
correction still goes to the issue or PR where it is durable. A briefing is regenerated and thrown
away; the record is what someone reads in six months.

The failure this prevents is quiet: once a briefing looks complete, the pull is to skip writing the
same thing where it lasts.

## Output

**Publish an Artifact by default.** Build the page yourself — this is a one-screen decision surface,
not a document, and rendering it through a general markdown-to-HTML converter gives it a table of
contents it does not need and an editorial register it does not want.

Load the `artifact-design` skill before writing the page, as any Artifact requires. Beyond that:

- **One screen.** If it scrolls like a report, it is not a briefing.
- **State reads at a glance** — done vs in-flight as form (a card, a dot, a rule), not only as words.
- **The impact table carries a "no change" row** and does not bury it.
- **Republish the same file path** when `/brief` is invoked again in a session, so it updates one
  page instead of leaving a trail of stale ones.
- Write the page in the user's language; keep this file in English like its sibling skills.

**Fall back to chat when there is no structure to show.** No comparison, no state board, no list —
say it in three sentences instead. Building a page for three sentences is its own kind of noise.
`--text` forces this.

## Do not

- **Do not soften the state to make it read better.** If CI is red, the briefing says CI is red.
- **Do not present a decision you have already made.** If there is genuinely nothing to choose, say
  so; a fake fork wastes the one section they were going to read.
- **Do not brief instead of fixing the explanation.** If the same thing needs a briefing twice, the
  underlying writing is the defect.
