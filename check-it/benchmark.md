# Measuring a performance claim

Read when `check-it`'s cost check (10) points here: the change claims a
performance effect, a review flagged a possible slowdown, or the repository's
build guidance names the path as needing a benchmark. The method is pstack's
benchmark checklist, read raw at
<https://raw.githubusercontent.com/cursor/plugins/e1cc03121a0e71129a4fb730d7c5528a0a3e43c8/pstack/skills/benchmark-checklist/SKILL.md>.

## Before running

- **Write the claim first**, in the words that would ship ("decode is 30% faster
  at p50 on the 4 KiB input"). Every question below tests that sentence.
- Read the benchmark's code: what it times, counts and ignores.
- A baseline build, or a copy of the code before the change, goes in the run
  folder and follows [`clean-it`'s rules](../clean-it/RULES.md); a Rust baseline uses the
  run's build folder for the repository.
- Check the machine is quiet (load average, core count). If it is not and cannot
  be stopped, alternate the sides so both see the same noise, and say so.

## The questions

1. **Name the limiter**: why is the change not twice as large? Find it in a
   profiling run that is not the reported one, since profilers slow the work.
   Where a load generator drives the run, check it does not saturate first, or
   it is what was measured. A change that did not move the number is explained
   by its limiter, so find it before calling the change useless.
2. **Every side runs as production runs it**: release build, production flags,
   the same data and versions, caches as warm or cold as production sees them.
   A side on defaults, or whose limiter is a setting, is untuned: tune it and
   measure again. Where it cannot be tuned, no winner is picked from that run.
3. **Do the arithmetic against limits**: bytes per second against disk and
   network bandwidth, operations per second times cost per operation against the
   cores, the time saved against the time the changed piece took. Removing a
   piece that takes 10% of the run makes the run at most about 11% faster. A
   result past a limit measured something other than the work.
4. **Count failures** and check outputs are correct, not only present. Rejections
   are fast, so errors flatter a number. If the script does not count errors,
   add the count.
5. **Repeat**: each side at least five times, alternating (A, B, A, B, ...) so
   warm-up and drift favour neither. Report the median and the range. A gap
   smaller than the run-to-run range is no measurable difference. When the call
   is close, use a rank-sum test or the harness's own statistics.
6. **Does it matter**: next to a micro result, measure the path a user waits on,
   with realistic data sizes and concurrency, and give the micro result as a
   share of it.
7. **Did the work happen inside the timed region**: the rows were written, the
   bytes were read, the result was used. Lazy code and timeouts produce numbers
   for work that never ran.

**Where the repository's benchmark tool compares against a saved baseline and
computes statistics itself** (criterion's `--save-baseline` and `--baseline`),
use that instead of hand-repeated runs; every question but 5 still applies.

**A ballpark the person asked for is one run, and the report says so.** It still
checks questions 4 and 7, and skips the rest unless that run looks wrong. A
choice between options is never a ballpark, and narrowing the claim to the code
as it ships today does not make it one.

## Report

Lead with the verdict: faster, slower, no measurable difference, or
inconclusive. Give the claim, the number with its unit, the run count, the range
and the limiter: "p50 41 ms to 33 ms, median of 7 runs per side, range 32 to 35 ms
after, bound by JSON parsing on one core."

The verdict is **inconclusive** when a difference is claimed and the limiter is
unknown, when a side ran untuned, or when questions 4 or 7 could not be checked.
Name the gap.
