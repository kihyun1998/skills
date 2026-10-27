# perf(metrics): add a memory/allocation measurement for the hot per-row structures

## What to build

The benchmark suite (`benchmark/pure_paths_benchmark.dart`) measures **time only**
(RunTime microseconds). Nothing measures the **heap footprint** of the per-row
structures the table derives on every data snapshot — notably:

- `RowLookup` — an `ids` list plus two maps (`idToIndex`, `idToGroup`), each
  O(rows), and
- `RowGeometry` — the parallel `heights` / `ids` arrays used for hit-testing.

At large row counts these O(rows) maps/arrays are a real allocation cost (a Dart
`Map` entry is far heavier than a list slot), but it is currently unquantified.

Add a memory / allocation measurement — mirroring the existing `benchmark/`
convention: it lives outside `test/`, is **not** a CI gate, and is invoked
explicitly — that reports the approximate heap footprint of these structures at
~1k and ~10k rows, so future allocation-reduction work (e.g. leaner id→index
storage, or avoiding the parallel-array duplication) can be measured rather than
guessed.

Use a pragmatic, repeatable approach. For example `ProcessInfo.currentRss`
delta with retention: build many structures, keep references so nothing is
collected, and read RSS before/after — size each measured phase large enough
(hundreds of thousands to ~1M rows) to clear the VM's heap-arena granularity,
and use a **retained** warmup so collectable garbage does not corrupt the
baseline (a cold before/after delta can otherwise read zero or negative). An
allocation count via the VM service / `dart:developer` is an alternative.
Record baseline figures.

## Acceptance criteria

- [ ] A repeatable measurement reports the approximate heap/allocation footprint of `RowLookup` (ids + idToIndex + idToGroup) and `RowGeometry` (heights + ids) at ~1k and ~10k rows
- [ ] Baseline numbers for the current representation are recorded, so future allocation-reduction can be compared against them
- [ ] The measurement lives outside the default test run / CI and is documented as machine-dependent / approximate
- [ ] `flutter analyze` clean

## Blocked by

None - can start immediately.

