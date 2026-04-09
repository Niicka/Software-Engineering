# 🔌 API 명세서 (API Specification)

> **프로젝트명**: 머니새니 (Money Sani)  
> **Base URL**: `https://api.moneysani.app/v1`  
> **문서 버전**: v1.0 | **작성일**: 2026.03.16 | **작성자**: 이나경

---

## 공통 사항

### 인증 방식
모든 API (로그인·회원가입 제외)는 **JWT Bearer Token** 인증을 사용합니다.

```http
Authorization: Bearer {access_token}
```

### 공통 응답 형식

**성공 응답**
```json
{
  "success": true,
  "data": { ... },
  "message": "요청이 성공적으로 처리되었습니다."
}
```

**실패 응답**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

### 공통 에러 코드

| HTTP 상태 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 400 | `INVALID_REQUEST` | 요청 파라미터 오류 |
| 401 | `UNAUTHORIZED` | 인증 토큰 없음 또는 만료 |
| 403 | `FORBIDDEN` | 접근 권한 없음 |
| 404 | `NOT_FOUND` | 리소스를 찾을 수 없음 |
| 409 | `CONFLICT` | 중복 데이터 충돌 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |

---

## 1. 인증 (Auth)

### POST /auth/register — 회원가입

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "nickname": "절약왕나경"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-1234",
    "email": "user@example.com",
    "nickname": "절약왕나경",
    "createdAt": "2026-03-16T09:00:00Z"
  }
}
```

| 유효성 검사 | 규칙 |
|-------------|------|
| email | 이메일 형식, 중복 불가 |
| password | 8자 이상, 영문+숫자+특수문자 포함 |
| nickname | 2~10자, 특수문자 제외 |

---

### POST /auth/login — 로그인

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "userId": "uuid-1234",
      "nickname": "절약왕나경",
      "level": "씨앗",
      "point": 150
    }
  }
}
```

---

### POST /auth/refresh — 토큰 갱신

**Request Body**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

---

### POST /auth/logout — 로그아웃

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "message": "로그아웃 되었습니다."
}
```

---

## 2. 사용자 (User)

### GET /users/me — 내 프로필 조회

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-1234",
    "email": "user@example.com",
    "nickname": "절약왕나경",
    "profileImage": "https://s3.amazonaws.com/moneysani/profiles/uuid-1234.jpg",
    "level": "새싹",
    "point": 350,
    "badges": ["첫_챌린지", "7일_연속_절약"],
    "createdAt": "2026-03-16T09:00:00Z"
  }
}
```

---

### PATCH /users/me — 프로필 수정

> 🔒 인증 필요

**Request Body**
```json
{
  "nickname": "절약고수나경",
  "profileImage": "base64_encoded_image_string"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "nickname": "절약고수나경",
    "profileImage": "https://s3.amazonaws.com/moneysani/profiles/uuid-1234.jpg"
  }
}
```

---

## 3. 소비 내역 (Expense)

### POST /expenses — 소비 내역 등록

> 🔒 인증 필요

**Request Body**
```json
{
  "amount": 4500,
  "category": "식비",
  "memo": "스타벅스 아메리카노",
  "spentAt": "2026-03-16T10:30:00Z"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| amount | Integer | ✅ | 지출 금액 (원 단위, 최소 1) |
| category | String | ✅ | 식비/쇼핑/교통/구독/여가/기타 |
| memo | String | ❌ | 소비 메모 (최대 50자) |
| spentAt | ISO8601 | ✅ | 지출 일시 |

**Response 201**
```json
{
  "success": true,
  "data": {
    "expenseId": "exp-uuid-5678",
    "amount": 4500,
    "category": "식비",
    "memo": "스타벅스 아메리카노",
    "spentAt": "2026-03-16T10:30:00Z",
    "aiAlert": {
      "triggered": false
    }
  }
}
```

> 💡 소비 등록 시 AI 충동소비 분석이 백그라운드에서 실행되며, 탐지 시 `aiAlert.triggered: true`와 함께 절약 팁이 반환됩니다.

---

### GET /expenses — 소비 내역 목록 조회

> 🔒 인증 필요

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| startDate | String (YYYY-MM-DD) | ❌ | 조회 시작일 |
| endDate | String (YYYY-MM-DD) | ❌ | 조회 종료일 |
| category | String | ❌ | 카테고리 필터 |
| page | Integer | ❌ | 페이지 번호 (기본값: 1) |
| limit | Integer | ❌ | 페이지당 항목 수 (기본값: 20, 최대 100) |

**Request Example**
```
GET /expenses?startDate=2026-03-01&endDate=2026-03-31&category=식비&page=1&limit=20
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "expenseId": "exp-uuid-5678",
        "amount": 4500,
        "category": "식비",
        "memo": "스타벅스 아메리카노",
        "spentAt": "2026-03-16T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 42,
      "limit": 20
    }
  }
}
```

---

### GET /expenses/report/monthly — 월간 소비 리포트

> 🔒 인증 필요

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| year | Integer | ✅ | 조회 연도 |
| month | Integer | ✅ | 조회 월 (1~12) |

**Response 200**
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "month": 3,
    "totalAmount": 320000,
    "budget": 400000,
    "usageRate": 80.0,
    "categoryBreakdown": [
      { "category": "식비", "amount": 150000, "ratio": 46.9 },
      { "category": "쇼핑", "amount": 80000, "ratio": 25.0 },
      { "category": "교통", "amount": 50000, "ratio": 15.6 },
      { "category": "구독", "amount": 25000, "ratio": 7.8 },
      { "category": "여가", "amount": 15000, "ratio": 4.7 }
    ],
    "comparedToLastMonth": {
      "totalAmount": 290000,
      "changeAmount": 30000,
      "changeRate": 10.3
    },
    "weeklyTrend": [
      { "week": 1, "amount": 75000 },
      { "week": 2, "amount": 90000 },
      { "week": 3, "amount": 85000 },
      { "week": 4, "amount": 70000 }
    ]
  }
}
```

---

## 4. 예산 (Budget)

### POST /budgets — 예산 설정

> 🔒 인증 필요

**Request Body**
```json
{
  "year": 2026,
  "month": 3,
  "totalAmount": 400000,
  "categories": [
    { "category": "식비", "amount": 150000 },
    { "category": "쇼핑", "amount": 100000 },
    { "category": "교통", "amount": 60000 }
  ]
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "budgetId": "bud-uuid-9012",
    "year": 2026,
    "month": 3,
    "totalAmount": 400000,
    "categories": [
      { "category": "식비", "amount": 150000 },
      { "category": "쇼핑", "amount": 100000 },
      { "category": "교통", "amount": 60000 }
    ]
  }
}
```

---

### GET /budgets/current — 이번 달 예산 현황

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "totalBudget": 400000,
    "totalSpent": 320000,
    "remaining": 80000,
    "usageRate": 80.0,
    "alertStatus": "WARNING",
    "categories": [
      {
        "category": "식비",
        "budget": 150000,
        "spent": 150000,
        "remaining": 0,
        "status": "EXCEEDED"
      },
      {
        "category": "쇼핑",
        "budget": 100000,
        "spent": 80000,
        "remaining": 20000,
        "status": "WARNING"
      }
    ]
  }
}
```

> **status 값 설명**
> - `NORMAL`: 예산 80% 미만 사용
> - `WARNING`: 예산 80~100% 사용
> - `EXCEEDED`: 예산 초과

---

## 5. 챌린지 (Challenge)

### GET /challenges — 챌린지 목록 조회

> 🔒 인증 필요

**Query Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| type | String | `all` / `participating` / `completed` |
| category | String | 카테고리 필터 |

**Response 200**
```json
{
  "success": true,
  "data": {
    "challenges": [
      {
        "challengeId": "chg-uuid-1111",
        "title": "하루 커피값 아끼기",
        "description": "오늘 하루 카페 지출을 0원으로 만들어보세요!",
        "category": "식비",
        "targetAmount": 4500,
        "period": 1,
        "rewardPoint": 100,
        "rewardBadge": "커피_절약왕",
        "participantCount": 1248,
        "isParticipating": false
      }
    ]
  }
}
```

---

### POST /challenges/{challengeId}/join — 챌린지 참여

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "challengeId": "chg-uuid-1111",
    "joinedAt": "2026-03-16T12:00:00Z",
    "endAt": "2026-03-17T12:00:00Z",
    "status": "IN_PROGRESS"
  }
}
```

---

### GET /challenges/my — 내 챌린지 현황

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "inProgress": [
      {
        "challengeId": "chg-uuid-1111",
        "title": "하루 커피값 아끼기",
        "progress": 75.0,
        "endAt": "2026-03-17T12:00:00Z"
      }
    ],
    "completed": [
      {
        "challengeId": "chg-uuid-0000",
        "title": "배달 주 3회 줄이기",
        "completedAt": "2026-03-10T00:00:00Z",
        "rewardPoint": 300
      }
    ]
  }
}
```

---

## 6. 포인트 & 보상 (Point & Reward)

### GET /points — 포인트 내역 조회

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "currentPoint": 350,
    "history": [
      {
        "type": "EARN",
        "amount": 100,
        "reason": "챌린지 성공: 하루 커피값 아끼기",
        "createdAt": "2026-03-15T18:00:00Z"
      },
      {
        "type": "USE",
        "amount": -200,
        "reason": "기프티콘 교환: 스타벅스 쿠폰",
        "createdAt": "2026-03-12T10:00:00Z"
      }
    ]
  }
}
```

---

### GET /rewards — 교환 가능한 보상 목록

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "rewards": [
      {
        "rewardId": "rwd-uuid-2222",
        "name": "스타벅스 아메리카노 교환권",
        "requiredPoint": 500,
        "category": "기프티콘",
        "stock": 100
      },
      {
        "rewardId": "rwd-uuid-3333",
        "name": "편의점 1,000원 할인쿠폰",
        "requiredPoint": 200,
        "category": "할인쿠폰",
        "stock": 500
      }
    ]
  }
}
```

---

### POST /rewards/{rewardId}/exchange — 보상 교환

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "exchangeId": "exc-uuid-4444",
    "rewardName": "스타벅스 아메리카노 교환권",
    "usedPoint": 500,
    "remainingPoint": 0,
    "couponCode": "STAR-XXXX-XXXX",
    "expiresAt": "2026-06-16T23:59:59Z"
  }
}
```

---

## 7. AI 분석 (AI Analysis)

### GET /ai/tips — 개인화 절약 팁 조회

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "tips": [
      {
        "tipId": "tip-uuid-5555",
        "category": "식비",
        "message": "최근 3주간 카페 지출이 평균보다 40% 높아요. 텀블러를 가지고 다니면 한 달에 약 50,000원을 절약할 수 있어요! ☕",
        "alternativeSuggestion": "집에서 커피 내리기, 편의점 커피 활용",
        "estimatedSaving": 50000,
        "generatedAt": "2026-03-16T08:00:00Z"
      }
    ]
  }
}
```

---

### POST /ai/tips/{tipId}/feedback — 팁 피드백

> 🔒 인증 필요

**Request Body**
```json
{
  "feedback": "HELPFUL"
}
```

> `feedback` 값: `HELPFUL` | `NOT_HELPFUL`

**Response 200**
```json
{
  "success": true,
  "message": "피드백이 반영되었습니다. 더 나은 팁을 제공하겠습니다!"
}
```

---

## 8. 커뮤니티 (Community)

### GET /community/posts — 게시글 목록

**Query Parameters**

| 파라미터 | 설명 |
|----------|------|
| sort | `latest` (최신순) / `popular` (인기순) |
| page | 페이지 번호 |
| limit | 페이지당 항목 수 |

**Response 200**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "postId": "pst-uuid-6666",
        "title": "배달앱 끊고 한 달 만에 15만원 절약한 후기",
        "preview": "처음엔 너무 힘들었는데 2주차부터...",
        "author": { "nickname": "절약고수", "level": "나무" },
        "likeCount": 142,
        "commentCount": 28,
        "createdAt": "2026-03-15T20:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalCount": 198
    }
  }
}
```

---

### POST /community/posts — 게시글 작성

> 🔒 인증 필요

**Request Body**
```json
{
  "title": "첫 챌린지 성공 후기 공유해요!",
  "content": "하루 커피값 아끼기 챌린지 성공했어요. 생각보다 어렵지 않더라고요..."
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "postId": "pst-uuid-7777",
    "title": "첫 챌린지 성공 후기 공유해요!",
    "earnedPoint": 5,
    "createdAt": "2026-03-16T14:00:00Z"
  }
}
```

---

### POST /community/posts/{postId}/like — 게시글 좋아요

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "postId": "pst-uuid-7777",
    "likeCount": 1,
    "isLiked": true
  }
}
```

---

## 부록: HTTP 메서드 및 엔드포인트 요약

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| POST | /auth/register | 회원가입 | ❌ |
| POST | /auth/login | 로그인 | ❌ |
| POST | /auth/refresh | 토큰 갱신 | ❌ |
| POST | /auth/logout | 로그아웃 | ✅ |
| GET | /users/me | 내 프로필 조회 | ✅ |
| PATCH | /users/me | 프로필 수정 | ✅ |
| POST | /expenses | 소비 내역 등록 | ✅ |
| GET | /expenses | 소비 내역 목록 | ✅ |
| GET | /expenses/report/monthly | 월간 리포트 | ✅ |
| POST | /budgets | 예산 설정 | ✅ |
| GET | /budgets/current | 이번 달 예산 현황 | ✅ |
| GET | /challenges | 챌린지 목록 | ✅ |
| POST | /challenges/{id}/join | 챌린지 참여 | ✅ |
| GET | /challenges/my | 내 챌린지 현황 | ✅ |
| GET | /points | 포인트 내역 | ✅ |
| GET | /rewards | 보상 목록 | ✅ |
| POST | /rewards/{id}/exchange | 보상 교환 | ✅ |
| GET | /ai/tips | AI 절약 팁 | ✅ |
| POST | /ai/tips/{id}/feedback | 팁 피드백 | ✅ |
| GET | /community/posts | 게시글 목록 | ❌ |
| POST | /community/posts | 게시글 작성 | ✅ |
| POST | /community/posts/{id}/like | 좋아요 | ✅ |

---

> 📝 본 명세는 개발 진행에 따라 업데이트됩니다.  
> 버전: v1.0 | 최종 수정: 2026.03.16 | 작성자: 이나경
