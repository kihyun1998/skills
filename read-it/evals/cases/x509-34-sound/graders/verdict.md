---
type: llm
---

The run ends where it stops to have its reading of the issue confirmed, before any change.

PASS if the reply restates the change correctly, which is to replace `library x509_cert_store;` in the barrel with a bare `library;` while keeping the library doc-comment attached, and proposes doing it. Side questions are fine.
FAIL if the reply claims the issue's premise is false, that the work is already done, or that it conflicts with a recorded decision, or if it proposes something other than the directive change, or if it edits files.
