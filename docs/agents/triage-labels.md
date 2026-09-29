# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-grill`        | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Why one row diverges

`needs-triage` is the only role whose label string is not its upstream name. The
role is *"maintainer needs to evaluate this issue"*, and in this repo that
evaluation is a named act — `/grilling` — which an issue carries until it has
been stress-tested and sliced into tickets. The label reads `needs-grill` so it
says which act is owed rather than that one is.

The upstream string was carried here unchanged and **never applied to a single
issue**; no live skill writes it, and it did not exist on the tracker at all.
Both halves of that were invisible because the right-hand column is prose no gate
reads: nothing checks that a string in this table exists as a label, and nothing
checks that a label in use appears in this table. It went wrong in both
directions at once — `needs-triage` listed and absent, `needs-grill` present and
unlisted — and neither was caught by anything but a hand read.
