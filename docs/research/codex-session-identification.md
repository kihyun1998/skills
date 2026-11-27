# Codex local conversation identification

Research date: 2026-11-27. Scope: read-only identification for Herdr session
restore and cross-agent handoff. No model turn, resume, session connection,
daemon lifecycle command, hook installation, or configuration change was run.

## Finding

Use the **thread ID** as the conversation key. Retain the root session ID
separately when available. A product process PID, working directory, newest
rollout file, and root session ID do not individually identify the active
conversation. For future integration, capture the thread ID at the Codex
boundary, rather than attempting to reconstruct it from Herdr's foreground PID.

The supplied Herdr observation (`hc get t1df --json` reporting foreground
`node.exe`, PID 34352, without a top-level session identifier) was task context;
this pass did not rerun it or establish a PID-to-thread mapping.

## Verified locally

`codex --version` reported `codex-cli 0.172.0`. The executable command resolves
through `C:/nvm4w/nodejs/codex.ps1`.

Installed `codex resume --help` documents:

- `codex resume [SESSION_ID]`: UUID or session name; UUID parsing takes precedence.
- `--last`: most recent recorded session, not a specific terminal's active thread.
- `--all`: disables working-directory filtering.
- `--no-daemon`: runs without the shared background server, even when it is running.
- `--remote`: connects the TUI to an app-server endpoint.

`codex app-server --help` documents stdio, Unix-socket and WebSocket transports;
`codex app-server daemon --help` exposes daemon lifecycle management separately.
Only help commands were executed. Consequently a frontend process and a server
process must be modeled separately; the help does not establish which mode the
observed Herdr terminal uses. A shared server PID cannot be treated as a unique
conversation key.

The local Codex home contains `sessions/`, `thread-writer-locks/`, `sqlite/`,
`state_5.sqlite`, `thread_history_1.sqlite`, `history.jsonl` and
`session_index.jsonl`. Directory/file presence is verified; database tables,
lock contents/ownership and their supported external contracts were not inspected.

A UTF-8 metadata-only projection of the newest three rollout first records
showed CLI version 0.172.0 and `history_mode: "paginated"` in all three. One root
thread and its research subagent both used `D:\github\skills`; the subagent's
`id` differed from `session_id`, while its `session_id` equaled the parent's root
thread ID. The other root used another working directory. This is direct evidence
that cwd and root session ID are insufficient to distinguish all conversations.
The source independently specifies that `SessionMeta.session_id` equals the root
thread ID and that `SessionMeta.id` is a `ThreadId`.

No `CODEX*` environment variables were returned in this research tool's shell.
This negative observation applies to this execution environment only; it does not
contradict the upstream child-process injection mechanisms below.
The parent research agent separately measured `CODEX_THREAD_ID` in its direct
execution environment and confirmed it matched the root thread ID in local
metadata; `HC_TERMINAL_ID` was null. This is runtime evidence that the Codex-side
ID can be captured there, while a Herdr terminal association still requires a
separate boundary. The differing environment visibility was not diagnosed.

## Primary-source mechanisms

Sources were fetched as raw files from official `openai/codex` main, resolved
during this pass to commit `afe555b9d3e95b4f58b247212565070f1555bc5d`.
They are current upstream evidence, not a proven exact match for the installed
0.172.0 binary.

| Surface | Verified source behavior | Integration implication |
| --- | --- | --- |
| Shell tool child environment | `create_env` injects `CODEX_THREAD_ID` when a thread ID is supplied. A `CODEX_SESSION_ID` constant also exists; this pass did not trace its injection. | A deliberately invoked local helper inside Codex can capture the thread ID. An outside terminal launcher cannot assume it receives that variable. |
| Exec server child environment | `metadata.threadId` becomes `CODEX_THREAD_ID`; `metadata.toolCallId` becomes `CODEX_TOOL_CALL_ID`. | The variable describes the originating tool execution, not the foreground Node process. |
| Session-start hooks | `SessionStartRequest.session_id` is typed `ThreadId`; command input includes this ID, optional transcript path and cwd. Subagent-start input uses the same request field. | Hook field names must be interpreted through their actual types: hook `session_id` and rollout root `session_id` are not interchangeable by name alone. A lifecycle capture adapter is a candidate, not an installed or tested solution. |
| App-server metadata | `thread/read` accepts `threadId`; `includeTurns` defaults false. | Once the ID is known, metadata can be requested without requesting conversation bodies. |
| Loaded threads | `ThreadLoadedListParams` supports cursor and limit. | A loaded-thread inventory is a candidate server-scoped discovery surface; it does not alone associate one thread with a Herdr terminal. |
| Paginated history | Full-history hydration through `thread/read.includeTurns` is deprecated for paginated threads; source directs clients to `thread/turns/list` and `thread/items/list`. | Treat rollout JSONL and the current turn/item projection as different surfaces. Do not equate raw JSONL concatenation with the current transcript. |
| Rollout metadata | `SessionMeta` includes `history_base`, fork boundaries and `subagent_history_start_ordinal`; earlier inherited context can be excluded from child turn/item projection. | A handoff that reads raw files must account for inherited and reverted history; using the supported projection avoids reimplementing that logic. |

Source links:

- [Shell environment injection and constants](https://github.com/openai/codex/blob/afe555b9d3e95b4f58b247212565070f1555bc5d/codex-rs/protocol/src/shell_environment.rs)
- [Exec-server command metadata](https://github.com/openai/codex/blob/afe555b9d3e95b4f58b247212565070f1555bc5d/codex-rs/exec-server/README.md)
- [Session-start hook request and command input construction](https://github.com/openai/codex/blob/afe555b9d3e95b4f58b247212565070f1555bc5d/codex-rs/hooks/src/events/session_start.rs)
- [Thread read, loaded-list and turns-list protocol types](https://github.com/openai/codex/blob/afe555b9d3e95b4f58b247212565070f1555bc5d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs)
- [Rollout SessionMeta and session/thread identity](https://github.com/openai/codex/blob/afe555b9d3e95b4f58b247212565070f1555bc5d/codex-rs/protocol/src/protocol.rs)
- [App-server current API notes](https://github.com/openai/codex/blob/afe555b9d3e95b4f58b247212565070f1555bc5d/codex-rs/app-server/README.md)

## Proposed boundary and remaining gaps

For a future adapter, persist `{product, threadId, rootSessionId?, cwd,
capturedAt, captureSource}` against the Herdr terminal identity. PID is optional
process metadata, not the durable key. Capture on creation/resume or an explicit
in-session helper, and distinguish root threads from subagents. This is a design
recommendation based on the verified identity distinctions, not implementation.

This bounded pass did not verify: the observed terminal's daemon mode; an external
read-only API mapping a TUI/frontend PID to its currently selected thread; daemon
authentication/discovery details; hook delivery/trust configuration in installed
0.172.0; thread-writer-lock ownership semantics; CODEX_SESSION_ID runtime meaning;
resume behavior with concurrent writers; exact version compatibility of the
current upstream APIs; or complete current-history export. No absence claim is
made for those capabilities. Before implementing session restore and cross-agent
handoff, verify the terminal-to-thread capture boundary as well as record location.
