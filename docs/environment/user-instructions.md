# User instructions: where each line of `CLAUDE.md` came from

[`CLAUDE.md`](CLAUDE.md) in this folder is linked by `scripts/install-skills.sh` to
`~/.claude/CLAUDE.md` and `$CODEX_HOME/AGENTS.md`, so every session on the machine
loads it. This note is not linked anywhere. It records why each line is there, so a
line can be questioned or removed against its evidence (#42).

## How the lines were chosen

Distilled on 2026-10-28 from two sources:

- the 39 `feedback` auto-memories across 25 projects. Auto memory is per repository, which
  is why the same preference had been recorded once per project;
- the maintainer's own corrections from 2026-09-28 to 2026-10-28: 69 sessions, 1,337
  user messages and 450 question-tool answers. Only departures from the recommended option,
  typed answers, and messages correcting how the assistant worked count. Project decisions
  do not.

A line had to come from **two or more projects**, with two exceptions marked in its row: one the maintainer asked for directly while this was grilled (17), and one the model inferred and the maintainer adopted in a form they set (20). A rule a skill already holds still
qualifies, because a skill's rule applies only while that skill runs, and most corrections
came from sessions outside any skill. The budget is 20 lines, since the file is loaded
every session. The maintainer adopted each line one at a time.

Path shorthand: `proj/sid8:line` is `~/.claude/projects/-Volumes-T7-GitHub-<proj>/<sid8>*.jsonl:<line>`,
except `kihyun-skills` (`-Users-parkkihyun-development-github-local-kihyun-skills`) and `report`
(`-Users-parkkihyun-development-report`). Every quote was re-opened at its line on 2026-10-28.

## The lines

| # | Line (short) | Projects | Evidence |
|---|---|---|---|
| 1 | Korean in chat, reports, questions | 9 | "한국어로말해봐다시." just-admin-page/bb912ba7:3284; "뭔데 한국어로 말해봐" flutter-folderview/6ab2bb5e:2508 |
| 2 | Repository artifacts in English | 5 | "ㅇㅇ 문서나 주석은 영어로" x509-cert-store/3ea26eb7:154; "문서나 주석은 영어로 두고 싶은데?" just-tooltip/32391a85:344 |
| 3 | Decisions through the question tool, few at a time | 4, +2 | "질문은 질문스킬로" kubeckup/e021ed55:992; "다시 질문해그럼 질문스킬로" just-tooltip/32391a85:1305. *Few at a time*: veyra 05d6a55d:501, and this repo's own session ("다 하려하지 않아도됌") |
| 4 | Reasons with recommendations, terms explained | 9 | "추천하는거와 이유는?" just-tooltip/32391a85:1243; "추천하는거와 이유는? 래퍼토리라는게 뭔지도 궁금하" veyra/9875ff6d:3375 |
| 5 | Research before asking | 5 | "질문하기전에 다 조사해보고 다시 질문해. 조사라는건 코드 문서 뿐만아니라 인터넷 검색도 포함이야" kubeckup/e021ed55:1097; "아니 검색을해" veyra/7543899f:1405 |
| 6 | Do what you can yourself, now | 8 | "지금 고칠수 있는거 고치고 다시물어봐." flutter-password-input/d5e89dff:1143; "실측은 너가 ego lite 써서 해봐." just-admin-page/bb912ba7:5210 |
| 7 | Grounds, verified or not, nothing invented | 5 | "92~98% 라는 수치가 나온 근거가 무어ㅑ ?" report/ec8b3826:422; "너가 확인은 한거임? 못한거임 ?" macos-window-toolkit/1b4c40bc:2660 |
| 8 | Say what you are doing during long work | 4 | "뭐함? 얼마나 걸려? 자고싶은데" justpdf/70ebf887:1532; "확인하고있어 ?" just-sonner/7f3225da:1010 |
| 9 | Understand the goal before building | 5 | "그게 아니야. 접근방식이 잘못됐어." kihyun-skills/748914bd:203; "평균을 보고 싶은게 아닌데. … 내 접근방식 이해가 가?" veyra/9875ff6d:272 |
| 10 | Stay inside what was asked | 8 | "#20 닫는게 아니라 세션 닫고싶다느나말이었음 왜 닫아 다시열어 #20" flutter-password-input/d5e89dff:2624; "0.5.0 배포안했는데 그러지말자;" just-sonner/516d8896:1591 |
| 11 | Root cause, not a workaround | 6 | "근본적 원인을 개선해야하는거아님?" autonamu/45bb031e:10348; "breaking change여도 어차피 이거 쓰는 사람 많이 없어서 제대로 된 방향으로" justpdf/ee0ee069:2875 |
| 12 | 말만: report only, answer everything asked | 3+ | "git checkout을 왜 해야하냐고? 말만해봐" just-tooltip/4f2dbd77:2888; "justerm 물어본거 답안했어" kihyun1998/6ee107ad:306 |
| 13 | No metaphors or showy phrasing | 2 | just-blog `VOICE.md:151` (2026-10-14, the author's instruction: remove "비유로 멋진척하는 말"); just-blog `docs/agents/writing.md:129`; cover-letters `docs/writing.md:41` |
| 14 | Follow the repository's writing guide, reread before handing over | 4 | "'조용히 틀리는 곳' 이라는 표현은 인간은 안써." just-blog/4725c85c:448; "너무너무너무 별로야. 니가 읽어봤어?" showme-for-kiki/78e99d44:277. Guides that exist: just-blog `VOICE.md`, `docs/agents/writing.md`; showme-for-kiki `tone.md`; cover-letters and vacation_plan `docs/writing.md`; kubeckup `learning/WRITING.md`. Most corrections came where a guide already existed |
| 15 | Prototype first | 6 | "프로토타입으로 먼저 보여줘" kihyun-skills/748914bd:398; "html로 일단 써봐 내가 보기쉽게" report/ec8b3826:219 |
| 16 | Findings in repository docs or issues | 4 | "기록을 왜 claude.md에 남겨?" autonamu/45bb031e:8136; "다른 저장방안 필요하다고 이슈에 기록해" veyra/05d6a55d:2071 |
| 17 | A comment says what the code is | maintainer | Asked for while #42 was grilled (2026-10-28). It matches the comment rule `grill-the-graph` installs per repository, which names the destinations |
| 18 | Agree before holding the machine or the screen | 2 | "여기서 하니까 컴퓨터를 못쓰겠어서." veyra/9875ff6d:950; "AI가 계속 창 띄웠다가 내 키보드 뺏었다가 이러는게 불편해서" pokit/c9d801ca:110. The maintainer narrowed it to *agree first*, not *never* |
| 19 | REST limit: go around with GraphQL | 5 | "graphql로 머지하면되자나" x509-cert-store/3ea26eb7:801; "아냐 굳이. graphql로 머지해" just-admin-page/bb912ba7:1313. The maintainer narrowed it to the rate-limit case |
| 20 | Ask before checking my claims | inferred | Not stated by the maintainer as a rule. Drafted from "내가 그렇게 말해서 그런거아님? 근거 가져와" (this repo, `decant`'s retirement, ADR-0092). The maintainer set its form: ask, rather than agree or stop to research |

## Considered and left out

- **No AI attribution in commits** (4 projects): stays per project, since this repository
  uses the trailer.
- **Push straight to main** (about 7 projects): depends on the repository.
- **Name the success criterion and compare like with like** (autonamu only): left to that
  project.
- **Don't redo what automation covers** (just-tooltip only): line 10 already covers it.
- **Approach as the field's practitioner would**: not added. #45 measured two wordings and
  neither changed the plan.
