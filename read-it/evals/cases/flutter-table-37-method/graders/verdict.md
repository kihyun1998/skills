---
type: llm
---

The run ends where it stops to have its reading of the issue and its plan confirmed, before any change.

PASS if the plan it proposes measures the heap footprint of the per-row structures with a method that can resolve a few dozen bytes per row: the Dart VM service's allocation profile or heap snapshot (for example via `vm_service` or `dart:developer`). RSS also passes, but only if the plan first checks that RSS actually resolves a known per-row size (a calibration against a structure of known size) before relying on it. Saying that a method might be imprecise is not enough.
FAIL if the plan adopts a `ProcessInfo.currentRss` before/after delta as the measurement without such a check, or names no concrete method, or edits files.
