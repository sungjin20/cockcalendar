# 저장소 작업 규칙

## Git 원격 저장소

- Git 관련 작업을 시작하기 전에 `origin`의 fetch 및 push 주소를 반드시 확인한다.
- 올바른 원격 주소는 항상 `https://github.com/sungjin20/cockcalendar.git`이다.
- 주소가 다르면 `origin`의 fetch 및 push 주소를 위 주소로 변경한 뒤 작업한다. 별도로 설정된 push URL이 있는 경우에도 동일하게 교정한다.
- `origin`이 없으면 위 주소로 추가한다.
- 변경 후 `git remote -v`로 fetch 및 push 주소가 모두 올바른지 확인한다.

## 커밋 메시지

- 커밋 메시지는 항상 한국어로 작성한다.
- 제목과 본문 모두 한국어로 작성하되, 코드 식별자와 파일명 등은 원문을 유지할 수 있다.
