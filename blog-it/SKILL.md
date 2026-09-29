---
name: blog-it
description: "Turn what a session already worked out into a published blog post, in the author's voice, without leaving the repository in hand. Substance comes from the conversation; nothing is re-researched. One line governs it: technical content established in the session is fair to write up, while opinions and reactions belong to the author and are taken from what they actually said — where the session holds none, the gap is left or asked about, never filled. Tone notes, the site's address and its vocabulary come from the `jblog` command rather than being copied here, since prose in one repository cannot be checked against a blog in another. Drafts go to a temporary place, and source quoted from the repository in hand is approved before anything is published. Publishes Korean and English under one slug. Use when the author asks for a session's work to become a blog post."
---

Publish what this session already worked out, in the author's voice, from wherever you are.

## Goal

The moment someone decides to write is not in the blog's repository — it is in
whatever they were studying. By then the session already holds the substance:
the code that was read, the explanations exchanged, the author's own reactions.
What is missing is shape, metadata, and a way out.

Two failures are worth more than the rest of this file.

**Writing an opinion the author never held.** The technical half can be
reconstructed from the session; the judgment half cannot, and a post the author
cannot defend is worse than no post. Where the session holds no reaction, the
draft says so or asks — it never supplies one.

**Restating what the command already enforces.** This file is prose and nothing
checks it against the tool. Every payload rule, refusal and address lives in
`jblog`, which is tested; anything copied here is a second copy that goes stale
without going red.

## Before starting

Run `jblog auth status`. Logged out means stop — say so and let the author run
`jblog auth login`. Everything below assumes a session.

Read `jblog --help` once for the payload fields and exit statuses. **Do not
restate them here or in the draft** — that text moves with the tool.

## Workflow

1. **Settle the genre with the author, before drafting.** An introduction, a
   study log and a debugging post have different shapes, and the wrong one is
   only visible after the prose exists. Ask; do not assume from the material.

2. **Gather from the session; do not go looking.** List what the session
   actually established — what was read, what was measured, what was concluded.
   Re-researching produces a survey of the topic rather than a record of the
   work, and the author will not recognise it.

3. **Hold the line between what may be written and what must be quoted.**
   Technical content worked out in the session is yours to write up. Opinions,
   evaluations, surprise, and anything of the form *"this is the interesting
   part"* are the author's, drawn from what they actually said in this session.
   Where the session holds none, leave the gap visible or ask one question —
   inventing one is the failure this skill exists to avoid.

4. **Read the tone notes and use the author's own messages.** `jblog voice`
   returns them; hold them while polishing. **They are read, never written** —
   updating them belongs to the skills that live in the blog's own checkout,
   and the kill switch is theirs. If the command reports it cannot read them,
   say so rather than proceeding on a default voice.

5. **Draft to a temporary directory, in Markdown.** Never into the repository in
   hand — it belongs to whatever the author was working on, and a stray draft in
   someone else's tree is litter they have to find. The body is Markdown, and
   `jblog --help` names both what the blog renders and the handful of things that
   fail **without an error** — a dialect that is off, a fence that highlights
   nothing. Each of those is invisible until the page is public, so read it before
   drafting rather than after a refusal, since none of them produces one.

6. **Show every quotation from the repository in hand, before publishing.**
   That repository may be private, licensed, or someone else's. Publishing is
   irreversible, so what gets quoted is a decision the author makes with the
   quotes in front of them.

7. **Propose metadata and get it confirmed.** `jblog vocab` returns the
   categories and tags with their identifiers — resolve names to identifiers
   from that, and never guess one. A tag the blog does not have is a new tag,
   which is a choice worth naming out loud. For the thumbnail, prefer the
   category's; a tag's thumbnail is worth proposing only when that tag actually
   has one, which is rare.

8. **Publish both languages under one slug.** Korean first, then English with
   **the same slug and no metadata** — the second call adds a translation to the
   post that already exists, and metadata belongs to the post rather than to
   either language. Send the payload on standard input:

   ```sh
   jblog post create < draft.json
   ```

   A non-zero exit is a refusal that names the field. Show it to the author
   verbatim and fix the payload; do not translate it into your own words, and do
   not retry with a guess.

9. **Report the two URLs and delete the draft.** The post list joins strictly on
   language, so an article with one translation is missing from the other
   language's list entirely — if the second publish failed, say which language
   is live and which is not.

## What this skill does not do

- **Research.** The session is the source. A gap in it is reported, not filled.
- **Write the author's opinions.** See step 3.
- **Update the tone notes.** Read-only, by decision and by the command's shape.
- **Restate the blog's contracts.** Slug rules, required fields, tag pairing and
  language rules are enforced by `jblog` and reported by it.
- **Upload images.** There is no path for it; thumbnails are chosen from what
  the blog already has.
- **Publish without a person.** Every irreversible step — the quotations, the
  metadata, the publish itself — is confirmed first.

## Dependency

`jblog` — the blog's own CLI, linked from its checkout, not from this catalog.
It is the only thing this skill needs to know the name of: the tone notes' path,
the site's address and the vocabulary endpoints are all answers it gives, so
none of them is written down here.
