# to-deck — 스키마와 예시

출력은 **just-learn의 Import Format**이다 — 그대로 just-learn 임포트 폼에 붙여넣어
Deck을 만들 수 있다. 최상위는 선택적 `name`과 **`cards` 배열**, 각 카드는
`prompt`+`answer`(필수)다. 유형 분류·보기는 담지 않는다 — 객관식 보기(Distractor)는
just-learn이 같은 덱의 다른 정답에서 자동 생성한다. `origin`만은 예외로, 교재 원본
문제와 보강 문제를 가르는 provenance다(just-learn은 무시).

## Contents

- [파일 구조](#-)
- [카드 객체](#-)
- [제목 문제 — 번호 있는 과마다 반드시 한 장](#--------)
- [검증](#)

## 파일 구조

```json
{
  "name": "1",
  "source": "1.pdf",
  "cards": [ /* 카드 배열: workbook 먼저(교재 순서) → extra */ ]
}
```

- `name` — Deck 이름(보통 PDF basename). just-learn이 읽는 선택 필드. 비우면
  임포트 시 UI에서 입력한다.
- `source` — 출처 PDF 파일명(provenance). just-learn은 무시한다.
- `cards` — 카드 배열. `id` 순번(`q001`, `q002`, …). 워크북 문제를 교재 순서대로
  먼저, 그다음 extra quiz.

## 카드 객체

| 필드 | just-learn | 설명 |
| --- | --- | --- |
| `prompt` | **필수** (Prompt) | 문제 본문. 그 자체로 무엇을 묻는지 분명해야 한다. 다초점이면 좁히거나 쪼갠다. |
| `answer` | **필수** (Answer) | 정답 — 발문이 묻는 것만, 딱 그만큼. 채점 가능한 형태. 부연·해설을 answer에 녹이지 않는다. |
| `explanation` | 선택 (Explanation) | 답 너머의 부연·맥락 + 정답의 출처(구절·페이지·Tip). 채점 후 학습자에게 표시. 없으면 생략. |
| `id` | 선택 (재임포트 병합 키) | `q001`부터 순번, 파일 내 유일. 같은 은행을 다시 export·재임포트해도 진도가 보존된다. |
| `origin` | (무시) | `"workbook"`(교재 원본) 또는 `"extra"`(생성한 보강). provenance 마커. |

`answer`와 `explanation`을 나누는 것이 핵심이다 — just-learn은 **Answer**(학습자가
recall할 정답)와 **Explanation**(채점 후 표시되는 "왜")를 분리해 두었고, 단답 모드는
answer를 **정확 일치**로 채점하므로 answer에 군더더기가 붙으면 채점이 깨진다.
출처(성경 구절·페이지·"n번 Tip")는 `explanation` 텍스트 안에 녹인다 — just-learn이
학습자에게 보여주는 칸은 explanation뿐이라, 출처용 별도 필드를 만들어도 무시된다.
보기(`options`)는 to-deck가 만들지 않는다 — just-learn이 같은 덱의 다른 정답에서
자동 생성한다.

교재 원본 문제(`workbook`) — 다초점 발문("누구이며 + 목적은?")은 단일 초점 카드로
쪼갠다(교재 순서는 유지). 위 한 문제가 두 장이 된다:

```json
{
  "id": "q001",
  "origin": "workbook",
  "prompt": "요한복음 1:6-8에서 하나님이 보내신 사람은 누구인가?",
  "answer": "세례 요한",
  "explanation": "그는 빛이 아니라 빛의 증인이다. (요 1:8)"
}
{
  "id": "q002",
  "origin": "workbook",
  "prompt": "세례 요한을 보내신 목적은 무엇인가? (요 1:7)",
  "answer": "빛(예수님)을 증언하여 모든 사람이 믿게 하려는 것",
  "explanation": "요한 자신은 빛이 아니라 빛에 대한 증인일 뿐이다."
}
```

보강 문제(`extra`)도 같은 규칙. ① **설명형** — 답이 자연히 한 절·문장인 발문
(목적/이유/의미). 답은 묻는 것만, 부연은 explanation으로:

```json
{
  "id": "q007",
  "origin": "extra",
  "prompt": "요한복음 1:1의 '태초'라는 말은 무엇을 의미하는가?",
  "answer": "출처(근원)",
  "explanation": "'태초에'는 세상이 창조되기 전부터 말씀이 이미 계셨음을 나타낸다. (요 1:1)"
}
```

② **단답 용어형** — 답이 한 단어·짧은 용어. 책의 핵심 용어·인물·개념을 짚는다.
부연할 게 없으면 explanation은 생략:

```json
{
  "id": "q020",
  "origin": "extra",
  "prompt": "말씀이 육신이 되어 예수님이 온전히 사람이 되신 사건을 가리키는 교리는?",
  "answer": "성육신"
}
```

③ **성경 본문 빈칸형** — 암송할 만한 핵심 구절을 본문 그대로 옮기되, **고유명사
(지명·인명)나 핵심 단어**처럼 또렷이 외울 한 낱말·짧은 어구만 `____`로 비우고
그 말을 answer로 둔다. 조사·접속어 같은 곁말은 비우지 않는다. 빈칸은 한 카드에
한 가지 답, answer는 비운 그 말과 정확히 일치한다(정확 일치 채점). 출처 구절은
발문 끝에 단다:

```json
{
  "id": "q021",
  "origin": "extra",
  "prompt": "태초에 ____이 계시니라 이 ____이 하나님과 함께 계셨으니 이 ____은 곧 하나님이시니라 (요 1:1)",
  "answer": "말씀",
  "explanation": "'말씀'(로고스)은 곧 그리스도시다. 한 구절에 같은 빈칸이 여러 번 나오면 답은 하나다."
}
```

## 제목 문제 — 번호 있는 과마다 반드시 한 장

번호가 붙은 각 과는 그 과의 **제목 자체를 묻는** extra 문제를 **반드시 한 장**
낸다. 발문은 "이 과의 제목은 무엇인가?", answer는 **PDF에 인쇄된 제목 그대로**다
— 개념으로 바꾸거나 빈칸으로 비우지 않는다. 제목이 따로 없는 서론·개관 자료는
제외한다.

```json
{
  "id": "q022",
  "origin": "extra",
  "prompt": "이 과(제1주)의 제목은 무엇인가?",
  "answer": "말씀이 육신이 되어",
  "explanation": "요한복음 1:1-18."
}
```

## 검증

`scripts/validate.mjs`는 무의존(zero-dep) Node 스크립트로 덱 파일을 점검한다.
마무리 단계(Process 5)에서 돌린다.

```sh
node to-deck/scripts/validate.mjs path/to/1.deck.json
```

검사 항목: 최상위 `cards` 배열 존재(1장 이상), 선택 `name`은 문자열, 각 카드에
`id`·`prompt`·`answer`가 비지 않은 문자열로 존재, `origin`이 `workbook`|`extra`,
`id` 유일. 통과 시 `OK`, 아니면 문제 목록을 출력하고 종료 코드 1.
