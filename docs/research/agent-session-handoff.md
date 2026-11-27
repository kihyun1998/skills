# Local agent sessions: identification, restore, and handoff

Investigated on 2026-11-27 on the maintainer's Windows machine. This is research,
not an implementation decision or a claim that cross-product handoff works.

## Finding

A process name identifies a product, not a conversation. A reliable integration
needs the terminal address, the product's current conversation ID, its workspace,
and a supported way to read that conversation. Restoring a conversation in its
own product and handing its work to another product are different operations.

There is no need demonstrated here to reverse-engineer `claude.exe`. Existing
metadata and documented hook inputs provide a narrower starting point.

## Claude Code

### Verified locally

- The existing `session-restore` implementation identifies Claude processes,
  reads `~/.claude/sessions/<pid>.json`, and uses its `sessionId` and `cwd`.
  Its transcript lookup checks for the ID under `~/.claude/projects/`.
- A read-only `hc get` of one live Claude terminal returned `claude.exe` and
  a foreground PID. That PID's JSON file contained a session ID and workspace,
  and a matching transcript existed under the expected project directory.
- Parsing that transcript without printing its message contents found 5,962
  JSONL records, totaling 11,381,153 bytes. There were 959 `user` records,
  1,132 `assistant` records, and 62 `system` records. These are record counts,
  not human message or turn counts: tool results also occur in user records.
- The sample included 923 `tool_result` blocks, 923 `tool_use` blocks,
  assistant text blocks, user string content, `parentUuid` relationships,
  and two `compact_boundary` system records. The file also contained many
  metadata records. Finding metadata at its beginning does not establish
  that the file lacks messages.

These observations establish content availability in one existing session;
they do not prove complete recovery of every UI conversation, attachment,
subagent, branch, or compacted history.

### Official interface

[Claude's hook reference](https://code.claude.com/docs/en/hooks) documents
`session_id`, `transcript_path`, and `cwd` in hook input. Its subagent events
distinguish the main transcript from the subagent transcript.

[Session management](https://code.claude.com/docs/en/sessions) documents local
transcripts, explicit-ID resume, export, and restoration after compaction. It
also warns that the internal JSONL format changes between releases. A reader
must not assume every stored record belongs to the active conversation path.

## Antigravity CLI

### Verified locally

- The CLI data directory contains a conversation-ID-named `.db` and companion
  files under `~/.gemini/antigravity-cli/conversations/`.
- The corresponding directory under `brain/<conversation-id>/` also contains
  `.system_generated/logs/transcript.jsonl` and `transcript_full.jsonl`.
- Parsing the two logs without printing their contents found seven records in
  each, with `USER_INPUT`, `PLANNER_RESPONSE`, and `GENERIC` types. The normal
  log was 4,301 bytes, the full log 4,251 bytes. A filename containing `full`
  is not evidence that it contains strictly more information.
- The normal log's planner records expose fields for model, token usage,
  thinking, and tool calls. This small sample does not prove complete tool
  result or conversation coverage.
- No live `agy.exe` process was returned by the Windows process query during
  this investigation. Active-terminal-to-conversation mapping was not tested.

### Official interface

[Antigravity's hook documentation](https://antigravity.google/docs/hooks)
documents `conversationId`, `workspacePaths`, `transcriptPath`, and
`artifactDirectoryPath`. It explicitly places CLI transcripts under
`~/.gemini/antigravity-cli/brain/<conversationId>/.system_generated/logs/`.
The app and IDE have different data roots.

The same reference says CLI hooks load from workspace `.agents/hooks.json`,
global `~/.gemini/config/hooks.json`, or plugins; hooks placed in the CLI's
`settings.json` are not loaded. Hook installation must use the documented
location rather than copy Claude's settings shape.

[Conversation management](https://antigravity.google/docs/cli/conversations)
documents workspace-scoped history and resume. Installed `agy --help` exposes
`--conversation` for an explicit conversation ID. Neither resume nor a hook
was executed in this investigation.

## Codex

See [the focused Codex investigation](codex-session-identification.md).
The root investigation verified that `hc get` of one live Codex terminal exposed
a foreground `node.exe` PID and workspace, but no top-level conversation ID.
It also verified local JSONL files under `~/.codex/sessions/`. Their existence
does not establish that a current conversation's complete history is in one file.

The focused investigation found `history_mode: "paginated"` in three recent
local metadata records and distinguished a subagent's thread ID from its root
session ID. Official source offers session-start hook identity and a paginated
turn/item API. Runtime delivery of those interfaces in Herdr is not verified.
The parent session's shell had `CODEX_THREAD_ID` but no `HC_TERMINAL_ID`;
the terminal-to-conversation association cannot assume both are inherited.

## Implications for a proposed integration

These are recommendations, not maintainer-approved implementation decisions.

- Extend the existing session identification boundary before adding copy UI.
  `session-restore` already has collection, saved entries, and resume behavior;
  it is currently Claude-specific.
- Store product-qualified conversation identity and record locators. Do not
  select the newest file in a workspace: several terminals can use that workspace.
- Prefer documented lifecycle metadata to inferential process/file matching.
  A hook could record terminal identity alongside the product's conversation ID
  without a model call; environment propagation and lifecycle coverage still
  require a probe in each product.
- A handoff reader should inspect messages and tool results, distinguish
  compaction and branches, and compare the result with the actual Git tree.
  Native resume flags alone do not import history into another product.
- A copy action should need no response from the source model, so a usage limit
  does not prevent copying an already registered session reference.

## Not verified

- Product hooks receiving the correct `HC_TERMINAL_ID` in this installation.
- Registry updates after an in-process conversation switch, fork, or clear.
- Exact active Codex/agy terminal mapping through a new integration.
- Full reconstruction across compaction, subagents, images, and detached tasks.
- Native resume after changing accounts; the maintainer reports having tried
  Claude account switching successfully, but this investigation did not reproduce it.
- Cross-product handoff quality or an end-to-end restoration run.

No login, session restart, hook installation, or model request was performed.
No conversation text or credentials are reproduced in this note.
