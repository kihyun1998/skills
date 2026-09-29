---
name: to-deck
disable-model-invocation: true
description: "Turn a study PDF into a just-learn Deck (JSON in just-learn's Import Format) through an interactive Korean Q&A session. Recognises the questions a workbook/textbook already prints (kept in their original order, origin \"workbook\") and converts its definitions and concepts into extra generated questions (origin \"extra\") — a mix of explanatory questions and single-term recall questions whose answer is one word. Each item is a {prompt, answer} card in just-learn's Import Format with an origin provenance marker, no question-type labels — paste the output straight into just-learn to create a Deck. At the start it offers two modes: a one-at-a-time grilling session, or straight batch extraction. Use when the user wants to study from a PDF, build a just-learn deck or flashcards from a workbook/textbook, quiz themselves on a chapter's own questions plus extras, or invokes /to-deck or /grill-me."
---

# to-deck — 학습 PDF를 just-learn Deck(JSON)으로

학습용 PDF(워크북·교재·성경공부 교재 등)를 대화하며 훑어, **just-learn Import Format의
Deck JSON**을 만든다 — 그대로 just-learn 임포트 폼에 붙여넣으면 Deck이 된다. 한국어로
진행한다.

이런 자료는 보통 **자체 문제**(번호 붙은 문항)를 갖고 있다. 그래서 문제를 두
층위로 다룬다:

- **워크북 문제 (`origin: "workbook"`)** — 교재가 원래 인쇄해 둔 문제. **교재
  순서는 보존**하되, 단답이 가능하도록 다초점 발문은 좁히거나 쪼갠다(아래 "핵심
  규칙").
- **extra quiz (`origin: "extra"`)** — 본문·해설(Tip)에서 새로 뽑은 보강 문제.
  답은 발문이 무엇을 묻느냐에 따라 세 결로 나뉜다(길이를 정하는 게 아니라
  *발문이 무엇을 묻느냐*의 결과다): ① **설명형** — 답이 자연히 한 절·문장인
  발문(목적/이유/어떻게/의미); ② **단답 용어형** — 답이 한 단어·짧은 용어인
  발문(예: "…을 가리키는 교리는?" → "성육신"); ③ **성경 본문 빈칸형** — 외울
  가치가 있는 핵심 구절을 본문 그대로 옮기되, **고유명사(지명·인명)나 핵심
  단어**처럼 또렷이 외울 한 낱말·짧은 어구를 `____`로 비우고 비운 그 말을
  answer로 둔다(예: "태초에 ____이 계시니라 (요 1:1)" → "말씀"; "선지자가
  ____에서는 높임을 받지 못한다 (요 4:44)" → "고향"). 조사·접속어 같은 곁말은
  비우지 않는다. 책에 나온 핵심 용어·인물·개념은 단답형으로도 한 번씩 짚고,
  암송할 만한 핵심 구절은 빈칸형으로 한 번씩 짚는다.

문제는 유형(객관식/단답/참거짓/서술형)을 **구분하지 않고 보기도 만들지 않는다** —
just-learn이 학습 시점에 모드를 정하고 객관식 보기(Distractor)도 자동 생성한다.
출제기는 **명확한 prompt 하나 + answer 하나 (+ 부연이 있으면 explanation)**
(just-learn의 Card)만 만든다.

## Contents

- [핵심 규칙 — answer는 묻는 것만, 부연은 explanation](#---answer----explanation)
- [Input](#input)
- [Output](#output)
- [Process](#process)
- [Guardrails](#guardrails)

## 핵심 규칙 — answer는 묻는 것만, 부연은 explanation

just-learn의 Card는 **Answer**(학습자가 *recall*할 정답)와 **Explanation**(채점
후 보여주는 "왜 그게 정답인지")을 나눠 둔다. 단답(Short Answer) 모드는 answer를
**정확 일치**로 채점하므로, answer에 군더더기가 붙으면 채점이 깨진다. 그래서:

1. **`answer` = 그 발문이 묻는 것, 딱 그만큼.** 묻는 게 이름·용어면 짧게, 묻는
   게 목적·이유·의미면 답도 한 절·문장이 된다(그건 정당하다). **묻지도 않은
   부연·맥락·해설을 answer에 욱여넣지 않는다.** 길이가 아니라 *범위*가 기준이다.
2. **`explanation` = 답 너머의 부연·맥락 + 정답의 출처.** 성경 구절·페이지·"n번
   Tip" 같은 출처는 explanation 텍스트 안에 자연스럽게 녹인다(별도 필드를 만들지
   않는다 — just-learn은 explanation만 학습자에게 보여준다). 구절이 이미 발문에
   있으면 중복으로 또 적지 않는다. 부연할 게 없는 순수 단답이면 비워 둔다(억지로
   채우지 않는다).
3. **다초점 발문은 쪼개거나 흡수한다.** "누구이고 목적은?"처럼 둘을 묻는 발문에서
   두 초점이 **각자 외울 값이 있으면 카드 2장으로 분리**, 한쪽이 부차적이면
   **핵심만 answer로 두고 나머지는 explanation으로 흡수**한다.

## Input

- **PDF 경로** (또는 이미 대화 컨텍스트에 올라온 PDF). 없으면 먼저 물어본다.
- 선택: 범위(전체 / 특정 페이지·챕터), 목표 extra 문제 수.

## Output

`<pdf-basename>.deck.json` (PDF 옆에, 또는 지정 경로). 최상위는 just-learn Import
Format — `name`(Deck 이름) + `cards` 배열. 한 카드는:

```json
{
  "name": "1",
  "source": "1.pdf",
  "cards": [
    { "id": "q001", "origin": "workbook",
      "prompt": "요한복음의 저작 목적은 무엇인가? (요 20:31)",
      "answer": "예수를 믿어 그 이름으로 생명을 얻게 하려는 것",
      "explanation": "곧 예수가 하나님의 아들 그리스도이심을 믿게 하려는 것이다. (요 20:31)" }
  ]
}
```

`prompt`/`answer`는 just-learn Card의 필수 필드, `explanation`은 부연·출처를 담는
선택 필드(채점 후 학습자에게 표시), `id`는 재임포트 병합 키다. `origin`은 교재
원본이면 `"workbook"`, 보강이면 `"extra"`(just-learn은 무시하는 provenance).
스키마와 예시는 [REFERENCE.md](REFERENCE.md) 참조.

## Process

### 1. Ingest — PDF 읽기와 목록화

PDF를 읽는다(`Read`의 `pages`; 크면 나눠서). **콘텐츠 인벤토리**를 만든다:
(a) 교재가 자체 보유한 번호 문제들(순서대로), (b) extra quiz로 치환할 정의·
개념·해설. 사용자에게 짧게 요약해 보여준다.

### 2. Plan & Mode — 합의

범위·목표를 합의하고 출력 경로를 확정한다. 그리고 **진행 모드**를 묻는다:

1. **세션** — 한 문제씩 내가 묻고 사용자가 답 → 정답 확인. 워크북 문제를
   순서대로 끝내고 extra quiz로 넘어간다.
2. **바로 추출** — 대화 없이 본문·Tip에 근거해 정답을 도출, 한 번에 JSON 생성.

### 3. 워크북 패스 → extra quiz

**먼저 워크북 문제를 교재 순서대로**(`origin: "workbook"`), 그다음 extra quiz
(`origin: "extra"`)를 한 문제씩 다룬다.

- 세션 모드: 한 번에 하나씩 출제 → 사용자가 답함 → 교재 본문·Tip 근거로 정답을
  합의 → 기록. 막히면 더 쉽게, 너무 쉬우면 더 깊게.
- 바로 추출 모드: 같은 순서로 정답을 도출해 곧장 기록.

채점 이력은 **저장하지 않는다** — 결과물은 깨끗한 문제은행이다.

### 4. Persist — 즉시 누적 저장

확정된 문제는 **바로** JSON에 추가한다(중간에 끊겨도 손실 없게). 배열 순서는
**워크북(교재 순서) → extra**. `id`는 `q001`부터 순번.

### 5. Wrap up — 마무리

워크북/extra 개수와 파일 경로를 요약한다. `scripts/validate.mjs`로 스키마를
검증한다. 남은 섹션을 이어서 할지 묻는다.

## Guardrails

- **충실성**: 정답은 PDF 내용(본문·Tip)에 근거한다. PDF에 답이 없어 도출했다면
  밝히고 사용자 확인을 받는다. 지어내지 않는다.
- **복습(전 주차 참조) 제외**: 챕터 첫머리의 '복습' 문제는 직전 챕터 내용을
  반복하는 것이라 현재 PDF에 답이 없고, 직전 주차 문제은행에 이미 들어 있다.
  이런 전 주차 참조 문제는 **제외**한다 — 워크북 층위에는 해당 챕터가 자체적으로
  새로 묻는 문제만 담는다.
- **순서 보존(발문은 좁혀도 됨)**: 워크북 문제의 **교재 순서**는 보존한다. 다만
  단답이 가능하도록 다초점 발문은 단일 초점으로 **좁히거나 쪼갠다** — 순서만
  지키면 발문을 그대로 베낄 의무는 없다.
- **자립적인 질문**: 유형 라벨도 보기도 없으므로, 질문은 그 자체로 분명해야 하고
  정답은 채점 가능한 형태여야 한다. **모범답안을 `answer`에 길게 녹이지 않는다** —
  answer는 발문이 묻는 것만, 부연은 `explanation`으로 뺀다("핵심 규칙" 참조).
- **제목 문제 필수(번호 있는 과)**: 번호가 붙은 각 과는 그 과의 **제목 자체를
  묻는** extra 문제를 **반드시 한 장** 낸다 — 발문은 "이 과의 제목은 무엇인가?",
  answer는 **PDF에 인쇄된 제목 그대로**다(개념으로 바꾸거나 빈칸으로 비우지
  않는다). 제목이 따로 없는 서론·개관 자료는 제외한다.
- **성경 본문 빈칸형 충실성**: 빈칸형은 본문을 **그대로** 옮기고(임의로 바꾸지
  않음), 비우는 말은 되도록 **고유명사(지명·인명)나 핵심 단어**처럼 또렷이 외울
  거리를 고른다(조사·접속어 같은 곁말은 피한다). 한 카드에 빈칸은 한 가지 답,
  answer는 비운 바로 그 말과 정확히 일치해야 한다(정확 일치 채점). 출처 구절은
  발문 끝에 단다.
- **중복 방지**: 같은 개념을 살짝만 바꿔 반복 출제하지 않는다.
- 출력 파일이 이미 있으면 덮어쓰지 말고 이어붙이거나 사용자에게 확인한다.
