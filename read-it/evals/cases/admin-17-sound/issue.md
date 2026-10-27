# 게이트 보강: 모든 route.ts가 adminRoute로 감싸졌는지 검사

Part of #3

## 무엇
`src/app/**/route.ts` 가운데 `/auth` 아래가 아닌 것은 모든 HTTP 메서드 핸들러를 `adminRoute`로 감싸야 한다. 이것을 테스트(또는 lint 규칙)로 강제한다.

## 왜
route handler에는 layout이 적용되지 않는다. 미들웨어는 `/api/**`를 리다이렉트하지 않는다. 그래서 감싸기를 빠뜨린 handler는 로그인만 한 누구나, `/api`나 `/auth` 아래라면 아무나 호출할 수 있다. 지금은 그런 handler가 없지만 #5부터 늘어난다.

## 완료 조건
- 감싸지 않은 handler를 추가하면 테스트가 실패한다. 실패하는 것을 직접 확인한다.
- 예외(`/auth/*`)가 명시되어 있다.
- `docs/map/territory/admin-gate.md`의 Known holes에서 이 항목을 지운다.

## 출처
#3 PR-A 보안 리뷰(2026-10-23).

