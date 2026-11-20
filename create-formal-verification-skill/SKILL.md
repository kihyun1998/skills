---
name: create-formal-verification-skill
description: "Generate a project-local skill that formally verifies the code where a bug costs the most and tests reach the least, in any language, with whichever verification tool fits. Use for /create-formal-verification-skill, \"model-check this race\", \"prove this invariant\", or when concurrency, retries, state machines, parsers, or unsafe code need more than tests."
disable-model-invocation: true
---

# Create a formal verification skill

A test checks the cases that someone thought to write. Formal verification checks every case in a stated scope: every order of steps in a model, every input up to a bound, or every input. This skill finds the part of the repo where that matters most, verifies one property of it, and leaves a project-local skill that lets the next agent check a change against that property. Write that skill for an agent who reads it cold, mid-change, and has never seen your work. The user must be able to trust the result and act on it without learning the verification language.

## Choose the target from the code

Answer from the codebase, and ask the user only what you cannot observe. If the user named an area or a bug, start there.

A good target is a promise the code makes, where a break harms users and tests rarely reach the case that breaks it. Choose the strongest such target in the repo, not the one that is easiest to verify.

## Let the question choose the tool

Pick the tool that answers the question at the lowest cost: a model checker, a proof assistant, an SMT-backed verifier, or another tool. Whether events can happen in a bad order usually suits a model checker over a small model of the design, and TLA+ is the default for that in any language. Whether the code itself behaves for every input, as with memory safety, overflow, or a data-structure invariant, usually suits a verifier that runs on the code. If no verifier runs on this language, say so, and test the real code with generated inputs, not a hand model of the function. A property that must hold at every size, where a bound is not enough, can need a proof. Prefer a tool that the repo's developers can install and run, and tell the user why you chose it.

## What makes it good

- **True to the code.** Every part of the model or proof points to code that a reviewer can open. What the verification treats as one indivisible step is one indivisible step in the code. Names come from this repo.
- **Able to fail.** A check that you have never seen fail proves nothing. Show each property failing on a broken variant of the code it guards, such as a removed check or a reordered step.
- **Findings stay findings.** When the current code breaks the property, report it with the counterexample in the code's terms. Do not weaken the property or the model until it passes, and do not change product code unless the user asks.
- **Honest about scope.** Say what is verified, under which bounds and assumptions, and what is left out. A pass covers the model or the bound, not the whole system.
- **Readable without the tool.** State the property and the harm in one plain sentence each. Tell a counterexample as a short sequence of steps in the code's words.
- **Cheap to rerun.** One command, a reproducible tool version, and a run short enough that the next agent will use it on every relevant change.
- **Kept in step with the code.** Record which files and functions each check covers, and the commit at which you last confirmed that the verification describes them. When the covered code changes after that commit, the next agent can see that the verification needs another look.

## Find what no property covers

Being able to fail is asked of each property. Ask it the other way round as well: is each guard in the target code caught by some property? A guard is anything in the code that stops a bad outcome: a condition, an early return, a check before a state change, a value taken so that it cannot be used twice, a call that cancels pending work. List every guard in the covered functions.

For each guard, make the variant that breaks it the way the code could break: drop the early return, invert the condition, move the check after the state change, copy the value instead of taking it, or drop the cancelling call. Make it where the check runs: in the model if the check is a model, in the code if the verifier runs on the code. Before you read the result, confirm that the variant changed what you meant to change and nothing else. Then run the check and compare it with the run on the unchanged code. A property catches the guard only if it fails on the variant and passes on the unchanged code; a property that already fails on the unchanged code, such as one behind a finding you will report, catches nothing here. Restore the unchanged code and confirm that the check is back where it started.

A guard that no property catches is a gap. Before you write a property for it, find out why nothing caught it:

- **The broken branch never runs in the check**, because the model leaves out what would reach it or does not represent the guard at all. For a TLA+ check, TLC's coverage report shows the branch evaluated zero times. No property can catch it until the model reaches it: widen the model, or name the guard as uncovered for this reason.
- **The variant changes nothing the check can reach**, because another guard already stops the same case. Name the guard as uncovered, and name the guard that stops the case. A property written for it would only restate the guard.
- **The variant causes a harm that no property states.** Say the harm in one plain sentence, in the words of the promise, and write the property. Show it failing on the variant and passing on the unchanged code, or failing there only on the findings you will report.

Any guard can instead be named as uncovered with its reason, such as a check that the model takes as passed on purpose. Do not drop a guard from the list.

Keep the result as a guard table, one row per guard: the file and function, the guard in the code's words, where the variant was made (the model's action and line, or the code's line) and what it changed, and the property that caught it, or `uncovered` with the reason. Another agent must be able to make each variant again from its row.

## Generate the verify skill

Write a project-local skill with frontmatter that names the area and says when to use it. Without frontmatter, the skill never registers. From the skill alone, the next agent must be able to tell whether a change touches the verified code, run the check, tell a real bug from a modeling error, and update the verification when a change is intended. Put the coverage record, with the guard table, and the sync commit in the skill. Tell the next agent to add, change, or remove a row when a change adds, moves, or removes a guard, and to move the sync commit forward only after it confirms that the verification describes the code at the new commit. Use this repo's real commands, paths, and nouns, and leave no placeholders.

Read every result the check gives from the checker's own output, while you build the check and when you prove it, and do not ask the user to run anything to read it. Tell each violation as its shortest path in the code's words. The generated skill tells the next agent to read results the same way.

## Prove it before you hand off

Every run of a check, on the unchanged code, on a variant or on a scratch change, sends what the tool writes for itself to a set place and deletes it after the run, as [`clean-it`'s rules](../clean-it/RULES.md) say. The generated skill says the same for its own command in its own words, since it lives in a repository that may not have this catalog: where the tool's state goes, and that it is deleted after each run.

Follow the generated skill once, as the next agent would, on a scratch change that breaks the property in the real code. It must catch the break. Then drop the scratch change and confirm that the check is back where it started: passing, or failing only on the findings you will report. A verify skill that was never run is a draft. If the skill misses the break or a step does not run, fix the skill or the verification, not the scratch change.

## Hand off

Tell the user what you verified, which tool you used and why, the bounds, what the check found in plain words, how to run it, and what it does not cover, naming every guard that the guard table marks `uncovered`. Suggest a second target only if you found a close one. Point the user at `/maintain-formal-verification-skill` for bringing the verification back in line after changes that did not recheck it.
