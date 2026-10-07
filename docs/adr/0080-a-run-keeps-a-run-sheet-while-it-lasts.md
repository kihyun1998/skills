# ADR-0080 — A run keeps a run sheet while it lasts, outside the repository

**Status:** accepted. Amends [ADR-0071](0071-thegraph-is-four-skills-in-order.md),
which left `thegraph` with no run state.

A `/thegraph` run now keeps a **run sheet**: a file in the OS temp folder holding
each step checked off as it ends, a note each step leaves the next, and what is
carried for a person until `ask-it` puts it in front of them. It is deleted when
the run ends. This brings back a piece of what 0071 removed, on purpose, and the
lines below say which piece and why the rest stays gone.

## The call, and whose it was

The maintainer's, on 2026-10-07: *"임시파일로 todolist 만들어서 매번 이 todolist에
체크하면서 진행하는걸로 하면 좀더 정합하지 않을까 ? 다끝내고 지우는거 까지"*, then
*"단계진행 표시나 다음 단계하기전에 볼만한거를 적는거지"* — read-it telling make-it
something, make-it telling check-it *"only docs changed"*. Confirmed when 0071's
"no run state" was put to them: *"뒤집는거 맞아."*

## What it was decided on

- **Steps went unrecorded.** Twelve past `thegraph` sessions, counted: the four
  steps are expanded in nearly all of them; `lens` twice, `redden` three times,
  `firsthand`, `boundary`, `bare`, `sweep`, `silt` and `security-review` never.
  In one penterm run the confirm stop was asked in a question box and `make-it`
  was never expanded, so nothing outside the conversation knew where the run was.
- **What a step learned reached the next only through the context.** `check-it`
  decides for itself whether a change was prose; the carried items `ask-it` needs
  live in the model's context and do not survive a compaction.
- **The built-in task list is off for current models.** Read from the installed
  Claude Code 2.1.292: `TodoWrite` and `TaskCreate` are enabled for older model
  ids, or with `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`, which would turn them on for
  every session. A file was chosen over that switch.

## How it differs from what 0071 removed

The old run state was sixteen slots that **outlived the run** and sat in the
repository, where *"이게 저장소마다 계속 뭔가 망가져"*. The run sheet differs on all
three counts:

| | 0071's run state | The run sheet |
|---|---|---|
| Lives | across runs | one run; deleted at its end |
| Where | in the repository | the OS temp folder, outside every repository |
| Holds | a ledger of slots | steps, a note to the next step, what is carried |

**Deleting it loses nothing that has not already reached a person** — the
carried items reach one through `ask-it` before the deletion — so it is not the
place any record lives. Decisions stay in decision records, work in the tracker,
the why in the commit.

## The shape

- **Named so runs never collide, matched by what it holds.** The file name is the
  repository, the start time and a short random id. Issues are not always
  numbers — penterm's are `.scratch/<feature>/issues/NN-<slug>.md` — so the first
  line names the issue as `read-it` resolved it, with its title, and a new run
  compares that rather than a name.
- **A watcher may name it.** `thegraph-panel` adds the path to the text `/thegraph`
  expands to, and the run writes there; without it the run names its own. Runs
  write the sheet with the shell as often as with Write, so the watcher looks at
  the file, not at which tool touched it.
- **One left behind is the person's to pick up.** A new run that finds an
  unfinished sheet for the same issue shows its steps and carried items and asks
  whether to continue or start over; starting over deletes it.
- **`×` in `thegraph-panel` clears the line and leaves the file.** A run given up
  on screen can still be picked up by the next run on that issue, and the OS
  clears what nobody does.

## The cost, stated

Every step writes a file, and a model can check a step it did not do — the sheet
is the run's own account, not proof. What `thegraph-panel` draws from it is that
account too.
