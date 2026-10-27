# Drop the library name from the barrel's library directive

## Problem

`dart analyze lib test` reports one info on `main` since `lints` 6.1.0 (#31):

```
info - lib/x509_cert_store.dart:34:9 - Library names are not necessary. Remove the library name. - unnecessary_library_name
```

The barrel declares `library x509_cert_store;`. CI stays green because infos are not fatal, so the finding sits in every analyze run.

## Solution

Change the directive to a bare `library;`, keeping the library doc-comment above it attached.

## Notes

- Noticed while working #27; the cause is the lint bump in #31, not #27's change. Measured: `main` and the #27 branch report the identical info.
- No public API or behaviour change.

