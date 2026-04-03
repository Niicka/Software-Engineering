요구사항 명세서
설계서
일정계획서
테스트 계획서
(코딩이 있을 경우) 소스코드

2. 형상 항목(Configuration Items)

| 구분 | 형상 항목 | 파일 위치 |
| :--- | :--- | :--- |
| 요구사항 | 과제1. 프로젝트정의서 | /docs/requirements |
| | 과제3. 요구사항명세서 | /docs/requirements |
| | 과제4. 요구사항분석서 | /docs/requirements |
| 설계 | 과제5. 소프트웨어설계서 | /docs/design |
| 일정 | 과제2. 프로젝트관리계획서 | /docs/plan |
| 테스트 | 과제6. 테스트명세서 | /docs/test |
| | 과제7. 테스트결과서 | /docs/test |
| 소스코드 | 소스코드 | /src |

-> 모든 형상 항목은 Git 저장소에 등록한다.

3. 형상 식별 방법
3.1 버전 규칙: v.주.부.수
예) v1.0.0
Major: 요구사항 변경
Minor: 기능 추가
Patch: 오타/경미 수정

3.2 태그 전략
| 기준선(Baseline) | 설명 |
| :--- | :--- |
| requirements_freeze | 요구사항 확정 |
| design_complete | 설계 완료 |
| beta_release | 시제품 완료 |
| final_release | 최종 제출 |

Git 명령 예: (Commit 후) git tag requirements_freeze

4. 변경 관리 절차
4.1 변경 요청 절차

변경 필요성 확인
변경요청서 작성 (CR 문서)
별도 브랜치 생성
수정 작업
main 브랜치 병합
변경 이력 기록

5. 형상 통제 방법

모든 변경은 commit 메시지로 기록

commit 메시지 형식:
[구분자-번호] 변경 내용
예: [CR-01] 요구사항 3번 수정 - 로그인 정책 변경

구분자(prefix) 예시:
[CR] Change Request (변경 요청)
[FEAT] Feature (새 기능 추가)
[FIX] Bug Fix (오류 수정)
[DOCS] Documentation (문서 수정)

* 변경 요청(CR)이 있는 경우에는 CR 번호를 함께 기록한다.
  예: [CR-01], [CR-02]

** 주 최소 1회 commit **

6. 형상 상태 기록
6.1 기록 도구

git log
git tag
CHANGELOG.md 작성

6.2 변경 기록 예
v1.0.0 - 요구사항 확정
v1.1.0 - 설계 구조 변경
v1.1.1 - 오타 수정

7. 형상 검사
7.1 내부 점검 기준

- 모든 산출물이 Git에 등록되어 있는가?
- 태그가 단계별로 존재하는가?
- 변경 사유가 commit 메시지에 기록되어 있는가?

8. 백업 및 저장소 관리

GitHub 원격 저장소 사용

- 주 1회 push
- 로컬 + 원격 이중 보관
