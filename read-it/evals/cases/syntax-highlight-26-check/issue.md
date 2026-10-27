# SyntaxText가 마우스 휠에 기본 spring으로 미끄러지듯 스크롤한다

## Parent

#24

## What to build

`SyntaxText`가 소유한 세로·가로 컨트롤러 둘 다 `SmoothScrollController`(기본 motion = spring)가 된다. 아직 공개 파라미터는 없다. 마우스 휠은 목표까지 애니메이션되고, 드래그·스크롤바·키보드·트랙패드는 지금과 같다. 스크롤바와 컨트롤러를 공유하는 소유 구조(#8)는 그대로다.

테스트는 공개 위젯 `SyntaxText` 하나를 이음매로, 마우스 kind `TestPointer`로 hover→scroll을 보내고 스크롤 뷰의 `pixels`만 관찰한다. 컨트롤러 타입은 검사하지 않는다. Prior art: flutter_folderview의 smooth wheel 위젯 테스트.

클래스 doc의 스크롤 절에 휠 동작을 적는다.

## Acceptance criteria

- [ ] 세로 한 notch: 첫 프레임에 0과 목표 사이, settle 후 목표에 정확히 도착
- [ ] 끝 근처의 notch는 끝에서 정확히 멈춘다 — macOS(`BouncingScrollPhysics`) override 아래 매 프레임 `maxScrollExtent` 이하
- [ ] 휠 애니메이션 동안 세로 스크롤바가 매 프레임 뷰를 따라간다
- [ ] Shift+휠 notch가 가로를 애니메이션으로 움직인다
- [ ] 기존 드래그 테스트(세로는 넘어가고 가로는 선택 제스처가 가져간다)가 고쳐지지 않고 통과
- [ ] redden: 컨트롤러를 평범한 `ScrollController`로 되돌리면 애니메이션 테스트가 빨개지는 것을 확인
- [ ] 게이트 네 개가 각각 맨몸으로 초록

## Blocked by

- #25
