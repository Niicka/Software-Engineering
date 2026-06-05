# CHANGELOG

머니새니 (Money Sani) 프로젝트의 모든 변경 이력을 기록합니다.
버전 규칙: v주.부.수 (Major.Minor.Patch)

---
## v1.8.0 - 2026-06-06

### Added
- 소비 내역 컨트롤러 구현 (`src/backend/controllers/expense.controller.js`)
    - 소비 내역 등록: DB 저장 후 예산 초과 알림·AI 충동소비 탐지 비동기 처리 (FR-010)
    - 소비 내역 목록 조회: 카테고리·날짜 필터링, 페이지네이션 지원 (FR-011)
    - 월간 소비 리포트: 카테고리별 집계, 주차별 트렌드, 전월 비교, 예산 달성률 (FR-012~FR-016)
    - 소비 내역 수정·삭제 (FR-010)
- 소비 내역 라우터 구현 (`src/backend/routes/expense.routes.js`)
    - 소비 등록 POST `/expenses` (FR-010)
    - 목록 조회 GET `/expenses` (FR-011)
    - 월간 리포트 GET `/expenses/report/monthly` (FR-012)
    - 수정 PATCH `/expenses/:expenseId`
    - 삭제 DELETE `/expenses/:expenseId`
- AI 충동소비 탐지 모듈 구현 (`src/ai/impulse_detector.py`)
    - 규칙 기반 + 통계적 분석 결합: 일평균 3배 초과·건당 평균 2배 초과·야간 고액 지출 탐지 (FR-050~FR-052)
    - 카테고리별 개인화 절약 팁 및 대안 제시 (FR-053)
    - Flask API 서버 (`/analyze`, `/health`) 구현
- 월간 소비 리포트 화면 구현 (`src/frontend/screens/ExpenseReportScreen.tsx`)
    - 예산 게이지 바, 카테고리별 바 차트, 주차별 트렌드 차트, 전월 비교 카드 (FR-012~FR-016)
    - 월 네비게이터, Pull-to-Refresh, 에러 처리 포함

---
## v1.7.0 - 2026-05-29

### Added
- 사용자 인증 컨트롤러 구현 (`src/backend/controllers/user.controller.js`)
    - 회원가입: 이메일 중복 체크, bcrypt 비밀번호 해싱, JWT 발급 (FR-001)
    - 로그인: 이메일/비밀번호 검증, JWT 토큰 반환 (FR-002)
    - 내 프로필 조회 (FR-003)
    - 프로필 수정: 닉네임, 프로필 이미지 URL 변경 (FR-004)
    - 비밀번호 변경: 현재 비밀번호 확인 후 갱신 (FR-005)
    - 회원 탈퇴: 비밀번호 확인 후 계정 삭제 (FR-006)
- 사용자 라우터 구현 (`src/backend/routes/user.routes.js`)
    - 회원가입 POST `/users/register` (FR-001)
    - 로그인 POST `/users/login` (FR-002)
    - 프로필 조회 GET `/users/me` (FR-003)
    - 프로필 수정 PATCH `/users/me` (FR-004)
    - 비밀번호 변경 PATCH `/users/me/password` (FR-005)
    - 회원 탈퇴 DELETE `/users/me` (FR-006)

---
## v1.6.0 - 2026-05-25

### Added
- 과제6. 인스팩션예제 등록 (`docs/test/인스팩션예제.pdf`)

---
## v1.5.0 - 2026-05-23

### Added
- 과제5. 소프트웨어설계서 작성 완료 (`docs/design/소프트웨어 설계서.pdf`)
- 예산 라우터 구현 (`src/backend/routes/budget.routes.js`)
    - 전체 월 예산 설정 POST `/budgets` (FR-020, FR-024)
    - 카테고리별 예산 설정 POST `/budgets/categories` (FR-021)
    - 예산 현황 조회 GET `/budgets/status` (FR-022, FR-023)
    - 예산 삭제 DELETE `/budgets/:year/:month`
- 챌린지 라우터 구현 (`src/backend/routes/challenge.routes.js`)
    - 챌린지 목록 조회 GET `/challenges` (FR-030)
    - 내 챌린지 현황 조회 GET `/challenges/me` (FR-031)
    - 챌린지 참여 POST `/challenges/:challengeId/join` (FR-031)
    - 챌린지 취소 PATCH `/challenges/me/:userChallengeId/cancel` (FR-031)

---
## v1.4.0 - 2026-05-18

### Added
- 과제4. 요구사항분석서 작성 완료 (`docs/requirements/요구사항 분석서.pdf`)
    - 소프트웨어 문맥도 (Context Diagram) 작성
    - 정적 분석: 주요 클래스 도출 (User, Expense, Budget, Challenge, UserChallenge, Point, Badge, AIAnalysis 등 12개 클래스)
    - CRC 카드 작성 (8개 핵심 클래스의 책임·협력 관계 정의)
    - 동적 분석:
        - 유스케이스 기술서 (UC-001~004)
        - 시퀀스 다이어그램: 소비 내역 저장 → 예산 알림 → AI 분석 14단계 흐름 정의
        - 상태 다이어그램: UserChallenge (NONE→IN_PROGRESS→SUCCESS/FAILED/CANCELLED), Expense AI 탐지 상태 (PENDING→ANALYZING→FLAGGED/NORMAL/RULE_BASED)
    - 인터페이스 분석: 화면 구성(SCR-001~050), 시스템 간 연계(IFC-001~006), 입출력 인터페이스
    - 요구사항 추적표 (FR/NFR/IR → 관련 클래스·화면·구현 컴포넌트 매핑)
- 챌린지 컨트롤러 구현 (`src/backend/controllers/challenge.controller.js`)
    - 챌린지 목록 조회 (FR-030)
    - 챌린지 참여: NONE → IN_PROGRESS 상태 전이, 중복 참여 방지 (FR-031)
    - 참여 취소: IN_PROGRESS → CANCELLED (FR-031)
    - 성공/실패 자동 판정: IN_PROGRESS → SUCCESS/FAILED, 진행률 계산 (FR-032)
    - 성공 시 포인트 적립 및 FCM 알림 발송 (FR-033)

### Changed
- `docs/requirements/` 파일 명칭을 한국어 설명형으로 재정리
    - `hw3_2024125039_이나경.pdf` → `요구사항 정의서.pdf`
    - `hw2_2024125039_이나경.pdf` → `프로젝트 정의서.pdf`

---
## v1.3.0 - 2026-05-13

### Added
- 과제3. 요구사항정의서 작성 완료 (`docs/requirements/hw3_2024125039_이나경.pdf`)
    - 기능적 요구사항 (FR-001 ~ FR-065) 전체 정의
        - 사용자 인증 및 계정 관리 (FR-001 ~ FR-006)
        - 소비 리포트 및 분석 (FR-010 ~ FR-016)
        - 예산 설정 및 알림 (FR-020 ~ FR-024)
        - 절약 챌린지 (FR-030 ~ FR-036)
        - 보상 및 인센티브 시스템 (FR-040 ~ FR-044)
        - AI 기반 충동소비 탐지 및 대안 제시 (FR-050 ~ FR-053)
        - 절약 커뮤니티 (FR-060 ~ FR-065)
    - 비기능적 요구사항 (NFR-001 ~ NFR-043) 상세 정의
        - 성능, 보안, 가용성, 유지보수성, 사용성 요구사항 명세
    - 인터페이스 요구사항 (IR-001 ~ IR-032) 정의
        - UI, 소프트웨어, 하드웨어, 통신 인터페이스 명세
    - 요구사항 추적 매트릭스 (Traceability Matrix) 작성
    - 기술 스택 요약 및 유스케이스 목록 (UC-001 ~ UC-006) 정리
- 예산 설정 컨트롤러 구현 (`src/backend/controllers/budget.controller.js`)
    - 전체 월 예산 설정 및 이월 기능 (FR-020, FR-024)
    - 카테고리별 예산 설정 (FR-021)
    - 예산 달성률 조회 및 80%/100% 임계값 상태 반환 (FR-022, FR-023)
    - 예산 삭제 기능

---
## v1.2.1 - 2026-05-08

### Changed
- 요구사항명세서 내용 보완
    - 비기능적 요구사항 항목 구체화 (성능, 보안, 유지보수성)
    - 요구사항 추적 매트릭스 업데이트
    - 용어 정의 및 약어 목록 정리

### Fixed
- API명세서 응답 형식 오류 수정
    - 에러 응답 코드 누락 항목 보완
    - 인증 관련 엔드포인트 설명 명확화

---
## v1.2.0 - 2026-05-01

### Added
- 소프트웨어 설계서 작성 완료
    - 전체 시스템 아키텍처 정의 (레이어드 아키텍처 패턴 적용)
    - 컴포넌트 구성 및 모듈 간 의존 관계 정의
    - 데이터베이스 설계 (ERD, 테이블 정의서)
    - 기술 스택 최종 확정 (Flutter / Spring Boot / MySQL / AWS)

---
## v1.1.2 - 2026-04-24

### Fixed
- 형상관리 계획서 내용 정확성 개선
    - 3.2 태그 전략 항목 누락 데이터 보충
    - 4.2 브랜치 전략 예시 코드 추가
    - 문서 구조 및 서식 통일

### Changed
- API명세서 마크다운 포매팅 개선
    - 헤더 계층 구조 재정리
    - 코드 블록 스타일 통일

---
## v1.1.1 - 2026-04-17

### Added
- 수정 가정 및 변경 사항 반영
    - AI탐지 기능 설계 변경 (머신러닝 모델에서 룰 기반 탐지로 변경)
    - 팀원 역할 조정 (AI 담당자 → Backend 담당자로 변경)
    - 추가 기능: 사용자 피드백 수집 및 분석 기능 설계

---

## v1.1.0 - 2026-04-09

### Added
- 과제2. 프로젝트관리계획서 작성 완료
    - 프로젝트 개요 및 목표 정의
    - WBS 및 개발 일정 수립 (3스프린트, 마일스톤 5개)
    - 팀 구성 및 역할 정의 (PM / Backend / Frontend / Design / AI / QA)
    - 품질 관리 및 리스크 관리 계획 수립
    - 개발 환경 및 산출물 목록 정의

---

## v1.0.0 - 2026-03-16

### Added
- 과제1. 프로젝트정의서 (시스템정의서) 작성 완료
    - 시스템명: 머니새니 (Money Sani)
    - 개발 배경 및 목적 정의
    - 주요 기능 6가지 정의 (소비리포트, 예산설정, 챌린지, 보상, AI탐지, 커뮤니티)
    - 유사 시스템 분석 (토스)
- GitHub Repository 최초 생성
    - README.md 작성
    - 폴더 구조 설정 (/docs, /src)