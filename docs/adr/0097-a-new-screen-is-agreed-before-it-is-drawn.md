# ADR-0097 — A new screen is agreed before it is drawn

**Status:** accepted.

`design-it` agrees a **design brief** with the person before any UI variant is
drawn: the screen's job, who reaches it and in what situation, the one thing they
must do and how success would show, the real content at minimum, typical and
maximum, the states that matter, scope, constraints and taste in words. It drafts
every field from what it read, marks what it assumed, and asks only the two or
three questions that would change the screen most, one at a time as ADR-0064
has every human stop do. Once the person confirms it, `prototype`'s UI branch
builds variants to it, in one HTML file where the screen has no web route, and the
hand-over states the fidelity and what to judge and ignore. The verdict is a
variant, a mix, or none, which sends the interview back for what the brief missed.

`make-it` calls it before the first test when a change adds a screen or reshapes
one's structure, and then writes the picked design test-first, look included.
Wherever a run sheet exists, the brief and, after the verdict, the variant files
go in a `.design/` folder beside it, out of the working tree, with one pointer in
`## Carried`; nothing goes on the issue, and `ask-it` offers recording the brief
there and keeping the variants on a throwaway branch, since a commit waits for
the person. The folder goes with the run sheet.

## The call, and whose it was

The maintainer's, on 2026-10-30. They noticed that showing a UI prototype needed
an agreement first, asked for the questions designers ask, and chose three
recommended options: a new skill in this catalog that calls `prototype` rather
than an edit to it, model-invoked, with the brief kept on the issue. Asked whether
`thegraph` would use it, they chose to wire it in through `make-it`. After the
completeness read they settled its two open cases: the interview drafts first and
asks what would change the screen most, and a screen with no web route gets one
HTML file. After a second completeness read over the commit, they settled two
more: the brief and variants wait beside the run sheet rather than in the working
tree, and the questions follow ADR-0064.

Their standing instruction to build a prototype before describing a design
(`docs/environment/CLAUDE.md`) pulls the other way; this call puts a short
interview before the prototype and keeps the prototype itself.

## What it was decided on

- **Prior art.** Two published skills do the interview: `shape` (pbakaus), two
  rounds of two or three questions and a seven-part brief, no CSS values asked;
  and `design-discovery` (designpowers), a quick and a full mode and an
  accessibility spectrum. Critique practice (uxtigers) has the presenter state
  the user, the goal, the constraints, the fidelity and the feedback wanted
  before showing. Both skill pages and that article were read directly; the
  brief-template sources were seen only as search summaries.
- **`prototype` is not ours to edit.** `~/.claude/skills/prototype` is a clone of
  `mattpocock/skills`; an edit there conflicts on every pull. It is declared in
  `docs/agents/skill-dependencies.md` instead. Its UI branch says both that the
  winner is promoted to a real route (`UI.md` step 6) and that promoting the
  prototype is an anti-pattern; `make-it` takes the second.
- **Model-invoked.** The point is that a UI request does not skip the agreement,
  so the model has to reach it unasked, and `make-it` has to reach it.
- **`make-it`, not `read-it`.** `read-it` returns a route label and holds that
  what a label calls is not its to know, so the condition sits in the step that
  writes.
- **The tracker door.** `thegraph` and `make-it` let nothing reach a tracker
  unasked, and both `design-it`'s brief and `prototype`'s capture write to the
  issue; under `make-it` both wait for `ask-it` or the report.
- **Beside the run sheet, not in the tree or on it.** The second read found
  variant files left in the working tree reach `check-it`'s reviewer as part of
  the change (it reads every untracked file) and, in a cluster run, the next
  child's local commit; and a brief written under the `make-it` line is erased
  when a cluster run rewrites the step list for the next child. `check-it`
  already saves its reports beside the run sheet, so the folder follows it.
- **One question at a time.** ADR-0064 settled how a human stop asks: one reply
  at a time, in dependency order, with the count remaining. The first cut took
  shape's two or three per round without weighing that record; the record
  governs.
- **Record by the run sheet, not by the caller.** A model-invoked skill can be
  reached in a run without `make-it`; keying on the run sheet keeps the tracker
  door shut either way.
- **The run sheet's parser.** `thegraph-panel` ends `## Carried` at any `##` line
  and reads each `- ` line there as an item, so the brief's template heading
  would end the section and its fields would become eleven items. Indented lines
  under a step are skipped, which a parse of a sample sheet confirmed.
- **Draft first.** The first cut asked two rounds of two or three questions
  against nine fields, so a screen step 1 said little about ran out of questions
  before the fields ran out. `shape`, read directly, makes one round the default,
  a second only for a material gap, and says to "assert the likely reading and
  invite correction".
- **One HTML file without a web route.** `prototype`'s switch is a `?variant=`
  URL. `mods/ENGINE-NOTES.md`'s workflow already prototypes a mod's look as an
  HTML page and chooses from there, and the `/thegraph` run below, told not to
  install anything, built its variants that way unprompted. The stage judges
  structure and flow, which HTML shows; a platform's own widgets it does not.
- **"Design brief", not "brief".** **Brief** already names what `check-it` hands
  to `lens`, and `brief` is a skill.

## Measured on the change

All headless (`claude -p`, stream-json) in a scratch React repo with two local
issues, the first Skill call read from the trace:

- **`/make-it`, told the reading and confirm were done:** the new-screen issue
  called `design-it` 3 of 3; the typo in an existing screen called `tdd`, not
  `design-it`, 3 of 3.
- **Plain requests, two runs each:** a button colour and more padding called no
  skill; a new profile screen, three variants of a settings page and a layout
  redesign called `design-it`. A first batch was void: `claude -p` read the loop's
  stdin and saw all five requests at once.
- **One `/thegraph` run on the new-screen issue, resumed with answers:** the
  confirm stop named `design-it` as the next step; the interview skipped what the
  confirm had settled; the brief came back in the template, its interpretations
  listed; the brief went to the run sheet and Carried; three variants were built
  and handed over with the four framing lines; after the pick the run wrote the
  component test-first, ran `check-it`, and `ask-it` offered recording the brief
  on the issue as one of its decisions. The issue file was never written.
- **Draft first, after the two cases were settled:** "make a profile edit
  screen", headless: the first wording drew a full draft with *assumed* marks
  once in two runs and three bare questions the other time. With the rule that
  the questions go out beside the draft, three of three showed every field with
  its source or mark and asked three questions.
- **No web route:** in a scratch Flutter repo, told the brief was settled, the
  run put three variants in one `design/notification-settings.html` with a
  switcher, framed the hand-over and offered a variant, a mix or none. It also
  opened the file in the default browser unasked.

- **A second `/thegraph` run, on the current text but one line:** the brief came
  as a draft with *assumed* marks and three questions; an answer carrying
  corrections got the corrected brief shown again and a yes asked for; the
  confirmed brief went under the `make-it` line with a `## Carried` pointer;
  variants came as one HTML file with the framing; the mixed verdict was written
  test-first with a stylesheet; and `ask-it` offered recording the brief on the
  issue and keeping the variants on a throwaway branch. The issue file was never
  written. The line it did not follow told `make-it` to commit the variants to a
  local branch before the first test as not the person's to approve; the run
  declined, citing the harness rule that a commit waits for the user, which
  outranks a skill. The text then said what the run did; the second read moved the variants out of
  the tree instead.

The first `/thegraph` run used the first cut: two interview rounds, no `make-it`
section in `design-it`, and no "its look included" in `make-it`. It showed the two gaps the
last two close: the prototype file stayed in the working tree through `make-it`
and `check-it`, and the brief's mobile constraint did not survive the test-first
rewrite — the component shipped with no styles and about 20 px buttons, which
`ask-it` raised as a decision rather than `check-it` as a defect. Between the
two runs, three more gaps closed: a correction was taken as a yes, the brief
reached the run sheet with no `## Carried` pointer and so never reached `ask-it`,
and the rules sat at the bottom of `design-it` instead of in the step that acts.

After the second read, on the changed text:

- **One question at a time**, "make a profile edit screen", two runs: one drew
  the draft and asked "question 1, two more to come"; the other never invoked
  `design-it` and asked two questions in prose, where the same request had
  invoked it two of two before.
- **A `/thegraph` run to the variants:** the brief and the variants went into the
  `.design/` folder, the working tree stayed clean and `## Carried` pointed at
  the brief, but the run drew no draft for the person and asked nothing: it
  treated every field as sourced from the confirm stop and went straight to
  variants. Step 3 now opens by saying it stops for the person even when every
  field has a source, and nothing is recorded or drawn before the yes.
- **Two fresh `/thegraph` runs to that stop:** both showed the whole draft with
  sources and assumed marks, asked one question with the count remaining
  ("1 of 3", "one more to come"), and stopped; neither wrote a `.design/` folder
  before the answer, and both working trees stayed clean.

The rest of the run after the verdict, with the variants moved beside the run
sheet, has not had a full run on this text.

## Not covered

Whether `check-it` should hold the finished screen to the brief's states,
maximum content and constraints.
