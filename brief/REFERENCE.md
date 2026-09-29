# brief — worked example and the vocabulary record

## The failure this skill was written from

2026-07-28, justerm. Three slices of cursor-blink work across one long session. At the point a
design decision needed an answer, the user wrote:

> 이해를 못했어 나한텐 어려운 내용이라. 쉽게 설명해줘. […] 지금 무슨 상황인지도 파악이 안되네
> 뭘 하겠다는건지도 모르겠고. 영향이 뭔지도 모르겠어.

Three questions — **state, intent, impact** — and none of them had been answered anywhere they could
find. The reply that worked was a one-screen page. This skill is that page's shape, generalised.

Note what the failure was **not**. It was not a missing summary at the end; it was that the decision
had already been requested. A briefing arriving after "which form should I build?" is late.

## The rewrite, line by line

What had been written, and what the same fact looks like when every noun points at something the
user can see or do:

| Written | Rewritten |
|---|---|
| "the spine's central question is whether a timeout fits the precedence chain" | "does 'stop after a while' belong with the other conditions?" — or cut entirely; it decided nothing for them |
| "#575 / #593 / #592" as subjects | "앱이 '깜빡이지 마'라고 하면 따르기" / "5분간 입력 없으면 멈추기" / "한글 조합 중엔 멈추기" |
| "the chain resolves blink only, not shape and visibility" | cut. It was true, and it answered a question they had not asked |
| "conformance item under the record" | "다음 조각" |
| "Step 4 real round-trip proof" | "실제 브라우저에서 확인했습니다" |
| "2 of 3 references adopt it" | "참고한 세 프로그램 중 둘이 같은 걸 합니다" |

The pattern is not shorter words. It is **removing nouns that name process rather than product**.
`spine`, `conformance`, `Step 4`, `ADR`, `promotion` are all real things — in the workflow, not in
the terminal the user is building.

## What actually resolved the confusion

Ranked by what the user responded to, not by what was hardest to write:

1. **The "no change" row.** The impact table's first row said *변화 없음* for the common case. Until
   that line existed, "we're changing how the cursor blinks" had no bound and read as risk.
2. **The measurement, labelled as one.** *"이건 추측이 아니라 측정한 결과입니다"* — with the actual
   numbers (1 colour vs 2 colours over 1.4 s). It converted a claim into something checkable.
3. **The conditions as a list.** Five existing conditions, one proposed sixth, visibly the same kind
   of thing. The change stopped being a new feature and became "one more line in a list that already
   exists".
4. **The rejected alternative, named.** "ghostty does more; we are not doing that, and here is the
   trade" pre-empted the "why not go further?" that would otherwise have arrived after the work.

## Words that have actually lost this user

A **record, not a rule** — the check in `SKILL.md` ("every noun points at something they can see or
do") is what catches the ones not yet on this list. This exists so the check has evidence behind it,
and so the same word is not re-introduced later as if it were plain.

| Word | Why it fails | Say instead |
|---|---|---|
| spine | names a tracker artifact, not a thing in the product | "the guess we wrote down", or cut |
| ADR / decision record | same | "we wrote the rule down" |
| precedence chain | describes internal structure, invisible from outside | "the conditions", "the list" |
| veto set | ditto, and it was wrong anyway | — |
| conformance item | process vocabulary | "the next piece" |
| Step 4 / Step 5 | numbers a workflow the user does not run | "we checked it in a real browser" |
| promotion | means nothing outside the workflow | "write the rule down properly" |
| corpus | reference vocabulary | "the programs we compared against" |
| falsified | technically exact, socially cold | "the guess turned out to be wrong" |
| an issue number as a subject | carries no information alone | name the behaviour, put the number in a label |

## Layout that worked

One screen, in this order. Deviate when the work calls for it — but know what each block was doing:

- **Header** — one sentence naming the subject in the user's terms, plus how many pieces are done
  out of how many.
- **Status board** — a card per piece, the current one visually distinct. Done vs in-flight readable
  without reading.
- **The conditions / the mechanism** — whatever the change is *one more of*. This is what makes a
  change feel bounded.
- **Impact table** — situation × now × after. **"No change" first** when it is the bigger part.
- **Why we are sure** — the measurement, with numbers, only if one exists.
- **Not doing** — the rejected alternative and its trade.
- **What you decide** — options, recommendation, and what each choice costs. Answerable without
  reading anything above it.
- **Footer** — dates, what was compared against, and the issue/PR numbers. Small, and last.

## Checks before publishing

- Can they act on it without asking a follow-up question?
- Does the impact section say what stays the same?
- Is every measured claim marked as measured, and every inferred one not marked?
- Was every status line (merged / closed / CI) produced by a command, not by memory?
- Is there a decision section even if the answer is "nothing"?
- Does anything appear here that does not also exist in an issue or PR? If yes, put it there first.
