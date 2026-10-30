---
name: design-it
requires: [prototype]
description: "Agree with the person on what a new screen is for, then have `prototype` build variants against that agreement. Use when a new UI design or a UI prototype is asked for, before any variant is drawn."
---

# design-it — agree first, then draw

A designer judges a screen against what it is for, never against whether it
looks good. So the agreement comes before the drawing: a **design brief**
the person has confirmed, then variants built to it, then a hand-over that says
what to judge them on. `prototype` owns how the variants are built; this skill owns the
design brief and the framing around them.

## 1. Read before asking

Gather what the brief can learn without the person: the issue, the page the
screen lives in or beside, the data it can reach, the design system or
component library, and any screen in the product that already does a similar
job.

## 2. Draft the design brief

Fill every field from step 1. Where nothing settles a field, write the likeliest
reading and mark it *assumed*; a field step 1 settled carries its source.

- **Job**: what the screen is for, and what problem it must solve.
- **People and situation**: who reaches it, from where, how often, on what
  device, in what state of mind. A role and a situation, never "users".
- **The one thing and its proof**: what the person on the screen must
  understand or do, and how anyone would know it worked.
- **What is only true here**: what this screen can claim that a template or a
  neighbouring product could not.
- **Real content**: the actual data, text and assets, with minimum, typical
  and maximum amounts.
- **States**: which of first use, empty, loading, error, success, no
  permission, overflow and expert use matter here.
- **Scope**: what is in, what is out, and what must stay untouched.
- **Constraints**: platform, framework, performance, accessibility (screen
  reader, motor, low vision, colour, second language, cognitive load),
  localisation, brand, deadline.
- **Taste signals**: products the person admires and how the screen should
  feel, in words; CSS values and style pickers are the variants' to show.

```markdown
## Design brief: <screen>
- Job:
- People and situation:
- The one thing:
- Proof of success:
- Only true here:
- Real content (min / typical / max):
- States that matter:
- In scope / out of scope / untouched:
- Constraints:
- Taste signals:
- Open decisions:
```

## 3. Ask what would change it most, then confirm

Show the whole draft, every field with its source or its *assumed* mark, and
with the question tool ask the two or three questions whose answers would
change the screen most, each naming why. The questions go out beside the draft,
never alone: the draft is what lets the person correct an assumption nobody
asked about. The rest of the assumptions stand unless the person corrects them.
Ask a second round only when the answers expose a material gap.

Then show the brief again for a yes or one round of correction. An answer that
corrects or adds to it is a correction, not a yes: show the corrected brief and
ask again. Variants wait for the yes, and the brief is confirmed then, with every
field the person's answer, a source, an assumption they let stand, or open by
their word.

Record the confirmed brief:

- **Called from `make-it` on a run sheet**: as indented lines under the
  `make-it` line, with no heading, plus one `## Carried` line pointing at it,
  e.g. `- Design brief for <issue>, under make-it: record on the issue?`.
  `ask-it` offers it; nothing goes on the issue from here.
- **Called from `make-it` with no run sheet**: in the report to the person.
- **Otherwise**: as a comment on the issue the work belongs to, or with no issue,
  at the top of the prototype's entry file.

## 4. Build to the brief

Run `prototype`'s UI branch with the confirmed design brief as its question.
Where the screen has no web route for its `?variant=` switch (a mod panel, a
Flutter or native screen), the variants go in one HTML file with the same
switcher that opens without installing anything. Every variant holds the job,
renders the real content at typical and maximum amounts, and reaches the states
the brief lists. Variants differ in structure, and each is labelled with the bet
it makes against the brief, e.g. "B: the one thing is the first thing seen,
history moves to a drawer".

## 5. Frame the hand-over

Hand the variants over with four lines before the URL:

- who the screen is for and what they are trying to do;
- the fidelity: structure and flow are under judgement, colour, spacing and
  copy are placeholders unless the brief said otherwise;
- what to judge: each variant against the brief's one thing, proof and states;
- what to ignore at this stage.

Ask for reactions in terms of the brief ("B hides the one thing below the
fold") rather than liking. When a reaction contradicts the brief, the brief was
wrong: correct it where it was recorded first, then the variants. The verdict is
one variant, a mix ("A's summary with C's undo"), or none; none goes back to
step 3 for what the brief missed. It is recorded beside the brief with the brief
lines it won on, and on a run sheet the verdict gets its own `## Carried` line.

## Called from `make-it`

Inside a `thegraph` run, the reading confirmed at its confirm stop is a source
for step 1: what it settled is not asked again. `prototype` stops at its
hand-over; its step 6 is `make-it`'s and `ask-it`'s.
