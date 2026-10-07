# mods

Claude Code mods: plugins of function hooks that draw in the terminal (a band, a
pane, the status line) or hook the session's events. They are not skills, and
the skill install scripts leave this folder alone.

## Install

```powershell
.\scripts\install-mods.ps1             # Windows; -DryRun previews, -Uninstall removes all
./scripts/install-mods.sh              # macOS / Linux / WSL / git-bash; --dry-run, --uninstall
```

The script is a sync. It validates every mod, rewrites
`.claude-plugin/marketplace.json` from the folders here, installs each mod at
user scope from this repo's marketplace (`kihyun-skills`), and uninstalls a mod
whose folder is gone. An install reads the mod from its folder here, so after
editing one, `/reload-plugins` in an open session picks it up; there is nothing
to reinstall.

From another machine, without cloning: `/plugin install <mod> --marketplace kihyun1998/skills`.

## Adding a mod

1. Make `mods/<name>/`. The folder name **is** the plugin name: the install
   script refuses a `plugin.json` whose `name` differs.
2. Give it the layout below, and at least one test.
3. `node scripts/check-mods.mjs <name>` — validates and runs its tests.
4. Run the install script, then commit the mod **and** the rewritten
   `.claude-plugin/marketplace.json`: an install from GitHub reads the committed
   copy, so a mod missing from it cannot be installed there.

```
mods/<name>/
├── .claude-plugin/plugin.json   name (= folder), version, author, description, types
├── hooks/hooks.json             { "modules": ["./register.tsx"] }
├── hooks/register.tsx           export const register: Register = (on, options) => { ... }
├── hooks/*.ts                   pure helpers the module imports, testable on their own
├── types/index.d.ts             the $.state contract, when the mod keeps state
└── tests/*.test.ts              claude plugin test runs these
```

`plugin.json`'s `description` is what the marketplace lists, so write it for
someone choosing whether to install.

## Developing one

An installed mod reloads on `/reload-plugins`. To have it reload on every save
instead, start a session with `claude --plugin-dir mods/<name>` — and disable the
installed copy in `/plugin` meanwhile, or the mod loads twice. Asking Claude to
write or change a mod uses a hot-reloading folder of its own; copy the result
here when it is done.

`node scripts/check-mods.mjs` with no names checks every mod. It is the gate for
this folder: run it before committing a change to any mod. CI runs the same
check (`.github/workflows/mods.yml`) on the Claude Code version pinned there;
raise the pin when the mods move to a newer one.

## Mods

| Mod | Notes |
| --- | --- |
| [`usage-band`](usage-band/) | Usage above the prompt; replaces the ccusage statusline. Why it looks the way it does: [`docs/environment/usage-band.md`](../docs/environment/usage-band.md). |
