> The refactoring standard: one line per choice, its reason and the issue it
> came from. `check-it`'s refactoring reviewer reads it; `ask-it` adds a line
> only where the person keeps it.

- An entry file whose path a settings file or a hook names is not renamed: a session started before the rename still names the old path (#143, #138).
- Similar parsers in different skills are not merged: they look for different things, and sharing would tie two skills together (#140).
- A tidy with no behaviour change, in code or text this change did not re-make, is not done on its own: a repeated loop, flags written in two places, a long function, an unused export, a file name, a repeated head comment, a doc restating a hook (#143, #146).
- Naming a value and a test helper written twice are style, and are not changed on their own, unless this change re-made the helper (#148, #149).
