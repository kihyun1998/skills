# The Windows last-error test no longer reproduces the GetLastError clobber

## Problem

`a failed wincrypt call reports a non-zero Win32 error` (the Windows FFI symbol test) exists to catch the bug `ensureBindingsResolved` fixes: a lazy binding resolved after a failed wincrypt call resets the thread-local last error to 0.

On `windows-latest` it no longer catches it. With the line in `ensureBindingsResolved` that reads `windowsBindings` removed, the test stays green — CI run 40066712623 (2026-10-24), 80 tests passed. So the guard is green whether or not the fix is in place.

The assertion itself can fail: with the reported Win32 value forced to 0, the test fails (run 40066976069).

## Notes

- Found while reddening a test change in #37; the weakness predates #37.
- The `ensureBindingsResolved` doc-comment records the original measurement. Which part of the sequence no longer resets the last error — the loader, the worker isolate, the runner's Windows build — is not known.
- A guard that cannot fail needs either a reproduction that still fails without the fix, or the fix's rationale re-measured on current Windows.
- Recorded in `docs/map/territory/verification.md`, Known holes.

