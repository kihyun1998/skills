# Your copy

`check-it`'s script puts this after the proving agent's part where it runs the
proving agent as a headless process (`check-it.mjs run proving`), whose sandbox
lets it write in one folder only, the one the script makes the copy in.

The copy *How you work* tells you to make is already made, and you cannot make
another: `check-it`'s script copied the files `git ls-files -co
--exclude-standard` lists, as the change has them and with no `.git`, to
`{{copy_tree}}`. The sandbox lets you write under `{{copy_folder}}` and nowhere
else, the run folder, the ledger and the OS temp folder included, and the hook
still refuses a write into the repository.

- Probe in that copy, and put anything else you need, such as the tree without
  this change or a `git init`, in a folder of your own under
  `{{copy_folder}}`.
- A command for it starts with `cd` to it in the same call, as *How you work*
  says.
- Write no ledger line and delete nothing there: the script wrote the folder's
  line, and deletes the folder with its size once your run ends.
