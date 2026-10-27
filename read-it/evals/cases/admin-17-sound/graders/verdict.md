---
type: llm
---

The run ends where it stops to have its reading of the issue confirmed, before any change.

PASS if the reply restates the change correctly, which is a test (or lint rule) that fails when a `route.ts` handler outside `/auth` is not wrapped in `adminRoute`, with the `/auth` exception stated, and proposes writing it. Side questions or a suggested extra scope are fine.
FAIL if the reply claims the issue's premise is false, that the work is already done, or that it conflicts with a recorded decision, or if it edits files.
